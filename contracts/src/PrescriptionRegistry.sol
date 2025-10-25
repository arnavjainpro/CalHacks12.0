// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {MedicalCredentialSBT} from "./MedicalCredentialSBT.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PrescriptionRegistry
 * @dev Manages prescription lifecycle without requiring patient blockchain interaction
 * @notice Doctors create prescriptions, pharmacists dispense them. All verified via SBTs.
 */
contract PrescriptionRegistry is Ownable {
    
    // ============ Enums ============
    
    enum PrescriptionStatus { 
        Active,      // Issued, not yet dispensed
        Dispensed,   // Filled by pharmacy
        Cancelled,   // Voided by doctor
        Expired      // Past expiration (checked at dispense time)
    }
    
    // ============ Structs ============
    
    struct Prescription {
        uint256 prescriptionId;
        uint256 doctorTokenId;           // Reference to doctor's SBT
        bytes32 patientDataHash;         // SHA-256 of patient identifying info
        bytes32 prescriptionDataHash;    // SHA-256 of medication details
        string ipfsCid;                  // IPFS CID where encrypted prescription is stored
        uint256 issuedAt;                // Timestamp of creation
        uint256 expiresAt;               // Expiration timestamp
        PrescriptionStatus status;
        uint256 dispensedAt;             // Timestamp of dispensing (0 if not dispensed)
        uint256 pharmacistTokenId;       // SBT ID of pharmacist who dispensed
        bytes32 patientSecret;           // Secret given to patient for access (hash of random nonce)
    }

    // ============ State Variables ============

    MedicalCredentialSBT public immutable credentialSBT;

    mapping(uint256 => Prescription) internal prescriptions;  // Now internal for privacy
    uint256 private _prescriptionIdCounter;

    // Audit trail mappings (internal for privacy)
    mapping(uint256 => uint256[]) internal doctorPrescriptions;      // doctorTokenId => prescriptionIds[]
    mapping(uint256 => uint256[]) internal pharmacistDispensals;     // pharmacistTokenId => prescriptionIds[]
    mapping(bytes32 => uint256[]) internal patientPrescriptions;     // patientDataHash => prescriptionIds[]
    
    // ============ Events ============
    
    event PrescriptionCreated(
        uint256 indexed prescriptionId,
        uint256 indexed doctorTokenId,
        address indexed doctorAddress,
        bytes32 patientDataHash,
        bytes32 prescriptionDataHash,
        string ipfsCid,
        uint256 issuedAt,
        uint256 expiresAt
    );
    
    event PrescriptionDispensed(
        uint256 indexed prescriptionId,
        uint256 indexed pharmacistTokenId,
        address indexed pharmacistAddress,
        uint256 dispensedAt
    );
    
    event PrescriptionCancelled(
        uint256 indexed prescriptionId,
        uint256 indexed doctorTokenId,
        address indexed doctorAddress,
        uint256 cancelledAt,
        string reason
    );
    
    event PrescriptionExpired(
        uint256 indexed prescriptionId,
        uint256 expiredAt
    );

    event PatientHistoryAccessed(
        bytes32 indexed patientDataHash,
        address indexed accessor,
        uint256 indexed accessorTokenId,
        uint256 accessedAt
    );

    // ============ Constructor ============

    constructor(address _credentialSBT) Ownable(msg.sender) {
        require(_credentialSBT != address(0), "Invalid SBT address");
        credentialSBT = MedicalCredentialSBT(_credentialSBT);
    }
    
    // ============ External Functions ============
    
    /**
     * @dev Doctor creates a new prescription
     * @param patientDataHash SHA-256 hash of patient info (name, DOB, ID)
     * @param prescriptionDataHash SHA-256 hash of medication details
     * @param ipfsCid IPFS content identifier for encrypted prescription data
     * @param validityDays Number of days the prescription is valid
     * @param patientSecret Secret to give to patient (hash of random nonce, put in QR code)
     * @return prescriptionId The ID of the newly created prescription
     */
    function createPrescription(
        bytes32 patientDataHash,
        bytes32 prescriptionDataHash,
        string calldata ipfsCid,
        uint256 validityDays,
        bytes32 patientSecret
    ) external returns (uint256) {
        // Verify caller is a doctor with valid credential
        uint256 doctorTokenId = credentialSBT.getHolderTokenId(msg.sender);
        require(doctorTokenId != 0, "No credential found");
        require(
            credentialSBT.hasValidCredential(
                msg.sender,
                MedicalCredentialSBT.CredentialType.Doctor
            ),
            "Invalid or expired doctor credential"
        );
        
        require(patientDataHash != bytes32(0), "Invalid patient data hash");
        require(prescriptionDataHash != bytes32(0), "Invalid prescription data hash");
        require(bytes(ipfsCid).length > 0, "IPFS CID required");
        require(validityDays > 0 && validityDays <= 365, "Invalid validity period");
        require(patientSecret != bytes32(0), "Patient secret required");
        
        _prescriptionIdCounter++;
        uint256 newPrescriptionId = _prescriptionIdCounter;
        
        uint256 expiryTimestamp = block.timestamp + (validityDays * 1 days);
        
        prescriptions[newPrescriptionId] = Prescription({
            prescriptionId: newPrescriptionId,
            doctorTokenId: doctorTokenId,
            patientDataHash: patientDataHash,
            prescriptionDataHash: prescriptionDataHash,
            ipfsCid: ipfsCid,
            issuedAt: block.timestamp,
            expiresAt: expiryTimestamp,
            status: PrescriptionStatus.Active,
            dispensedAt: 0,
            pharmacistTokenId: 0,
            patientSecret: patientSecret
        });
        
        doctorPrescriptions[doctorTokenId].push(newPrescriptionId);
        patientPrescriptions[patientDataHash].push(newPrescriptionId);

        emit PrescriptionCreated(
            newPrescriptionId,
            doctorTokenId,
            msg.sender,
            patientDataHash,
            prescriptionDataHash,
            ipfsCid,
            block.timestamp,
            expiryTimestamp
        );
        
        return newPrescriptionId;
    }
    
    /**
     * @dev Pharmacist dispenses a prescription
     * @param prescriptionId The prescription to dispense
     * @param providedPatientHash Hash of patient info from QR code (for verification)
     * @param providedPrescriptionHash Hash of prescription data from QR code
     */
    function dispensePrescription(
        uint256 prescriptionId,
        bytes32 providedPatientHash,
        bytes32 providedPrescriptionHash
    ) external {
        // Verify caller is a pharmacist with valid credential
        uint256 pharmacistTokenId = credentialSBT.getHolderTokenId(msg.sender);
        require(pharmacistTokenId != 0, "No credential found");
        require(
            credentialSBT.hasValidCredential(
                msg.sender,
                MedicalCredentialSBT.CredentialType.Pharmacist
            ),
            "Invalid or expired pharmacist credential"
        );
        
        Prescription storage rx = prescriptions[prescriptionId];
        
        // Verify prescription exists and is valid
        require(rx.prescriptionId != 0, "Prescription does not exist");
        require(rx.status == PrescriptionStatus.Active, "Prescription not active");
        require(block.timestamp < rx.expiresAt, "Prescription expired");
        
        // Verify data integrity (prevent tampering)
        require(
            rx.patientDataHash == providedPatientHash,
            "Patient data mismatch - possible tampering"
        );
        require(
            rx.prescriptionDataHash == providedPrescriptionHash,
            "Prescription data mismatch - possible tampering"
        );
        
        // Mark as dispensed
        rx.status = PrescriptionStatus.Dispensed;
        rx.dispensedAt = block.timestamp;
        rx.pharmacistTokenId = pharmacistTokenId;
        
        pharmacistDispensals[pharmacistTokenId].push(prescriptionId);
        
        emit PrescriptionDispensed(
            prescriptionId,
            pharmacistTokenId,
            msg.sender,
            block.timestamp
        );
    }
    
    /**
     * @dev Doctor cancels a prescription (only if not yet dispensed)
     * @param prescriptionId The prescription to cancel
     * @param reason Reason for cancellation
     */
    function cancelPrescription(
        uint256 prescriptionId,
        string calldata reason
    ) external {
        Prescription storage rx = prescriptions[prescriptionId];

        // Verify caller is the doctor who issued it
        uint256 doctorTokenId = credentialSBT.getHolderTokenId(msg.sender);
        require(rx.doctorTokenId == doctorTokenId, "Not the issuing doctor");
        require(rx.status == PrescriptionStatus.Active, "Cannot cancel - already processed");
        require(bytes(reason).length > 0, "Cancellation reason required");
        
        rx.status = PrescriptionStatus.Cancelled;
        
        emit PrescriptionCancelled(
            prescriptionId,
            doctorTokenId,
            msg.sender,
            block.timestamp,
            reason
        );
    }
    
    // ============ Access-Controlled View Functions ============

    /**
     * @dev Doctor can view their own prescription
     * @param prescriptionId The prescription ID
     * @return Prescription struct with all details
     */
    function getPrescriptionAsDoctor(uint256 prescriptionId)
        external
        view
        returns (Prescription memory)
    {
        Prescription memory rx = prescriptions[prescriptionId];
        require(rx.prescriptionId != 0, "Prescription does not exist");

        // Verify caller is the doctor who issued it
        uint256 doctorTokenId = credentialSBT.getHolderTokenId(msg.sender);
        require(rx.doctorTokenId == doctorTokenId, "Not the issuing doctor");

        return rx;
    }

    /**
     * @dev Patient can view prescription with their secret (from QR code)
     * @param prescriptionId The prescription ID
     * @param patientSecret The secret given to patient
     * @return Prescription struct with all details
     */
    function getPrescriptionWithProof(uint256 prescriptionId, bytes32 patientSecret)
        external
        view
        returns (Prescription memory)
    {
        Prescription memory rx = prescriptions[prescriptionId];
        require(rx.prescriptionId != 0, "Prescription does not exist");
        require(rx.patientSecret == patientSecret, "Invalid patient proof");

        return rx;
    }

    /**
     * @dev Pharmacist verifies prescription before dispensing (needs patient hashes)
     * @param prescriptionId The prescription ID
     * @param providedPatientHash Patient hash for verification
     * @param providedPrescriptionHash Prescription hash for verification
     * @return Prescription struct if verification passes
     */
    function verifyPrescriptionForDispensing(
        uint256 prescriptionId,
        bytes32 providedPatientHash,
        bytes32 providedPrescriptionHash
    )
        external
        view
        returns (Prescription memory)
    {
        Prescription memory rx = prescriptions[prescriptionId];
        require(rx.prescriptionId != 0, "Prescription does not exist");

        // Verify caller is a pharmacist with valid credential
        uint256 pharmacistTokenId = credentialSBT.getHolderTokenId(msg.sender);
        require(pharmacistTokenId != 0, "No credential found");
        require(
            credentialSBT.hasValidCredential(
                msg.sender,
                MedicalCredentialSBT.CredentialType.Pharmacist
            ),
            "Must be a valid pharmacist"
        );

        // Verify data integrity (prevent tampering)
        require(
            rx.patientDataHash == providedPatientHash,
            "Patient data mismatch - possible tampering"
        );
        require(
            rx.prescriptionDataHash == providedPrescriptionHash,
            "Prescription data mismatch - possible tampering"
        );

        return rx;
    }

    /**
     * @dev Check if prescription is currently dispensable (pharmacist-only)
     * @param prescriptionId The prescription ID
     * @param providedPatientHash Patient hash for verification
     * @param providedPrescriptionHash Prescription hash for verification
     * @return bool True if prescription can be dispensed right now
     */
    function isPrescriptionDispensable(
        uint256 prescriptionId,
        bytes32 providedPatientHash,
        bytes32 providedPrescriptionHash
    )
        external
        view
        returns (bool)
    {
        Prescription memory rx = prescriptions[prescriptionId];

        // Verify caller is a pharmacist
        uint256 pharmacistTokenId = credentialSBT.getHolderTokenId(msg.sender);
        if (pharmacistTokenId == 0) return false;
        if (!credentialSBT.hasValidCredential(msg.sender, MedicalCredentialSBT.CredentialType.Pharmacist)) {
            return false;
        }

        if (rx.prescriptionId == 0) return false;
        if (rx.status != PrescriptionStatus.Active) return false;
        if (block.timestamp >= rx.expiresAt) return false;

        // Verify data integrity
        if (rx.patientDataHash != providedPatientHash) return false;
        if (rx.prescriptionDataHash != providedPrescriptionHash) return false;

        // Verify doctor's credential is still valid
        if (!credentialSBT.isCredentialValid(rx.doctorTokenId)) return false;

        return true;
    }
    
    /**
     * @dev Get caller's own prescriptions (for doctors)
     * @return uint256[] Array of prescription IDs issued by the caller
     */
    function getMyPrescriptions() external view returns (uint256[] memory) {
        uint256 doctorTokenId = credentialSBT.getHolderTokenId(msg.sender);
        require(doctorTokenId != 0, "No credential found");
        require(
            credentialSBT.hasValidCredential(
                msg.sender,
                MedicalCredentialSBT.CredentialType.Doctor
            ),
            "Must be a doctor"
        );
        return doctorPrescriptions[doctorTokenId];
    }

    /**
     * @dev Get caller's own dispensals (for pharmacists)
     * @return uint256[] Array of prescription IDs dispensed by the caller
     */
    function getMyDispensals() external view returns (uint256[] memory) {
        uint256 pharmacistTokenId = credentialSBT.getHolderTokenId(msg.sender);
        require(pharmacistTokenId != 0, "No credential found");
        require(
            credentialSBT.hasValidCredential(
                msg.sender,
                MedicalCredentialSBT.CredentialType.Pharmacist
            ),
            "Must be a pharmacist"
        );
        return pharmacistDispensals[pharmacistTokenId];
    }

    /**
     * @dev Get all prescriptions for a patient by their data hash (doctors only)
     * @notice This function is for detecting prescription abuse patterns
     * @param patientDataHash SHA-256 hash of patient identifying info (name, DOB, ID)
     * @return uint256[] Array of prescription IDs for the patient
     */
    function getPatientPrescriptionHistory(bytes32 patientDataHash)
        external
        returns (uint256[] memory)
    {
        // Get caller's credential
        uint256 callerTokenId = credentialSBT.getHolderTokenId(msg.sender);
        require(callerTokenId != 0, "No credential found");

        // Verify caller is a doctor with valid credentials
        require(
            credentialSBT.hasValidCredential(
                msg.sender,
                MedicalCredentialSBT.CredentialType.Doctor
            ),
            "Must be a valid doctor"
        );

        // Emit audit event for compliance tracking
        emit PatientHistoryAccessed(
            patientDataHash,
            msg.sender,
            callerTokenId,
            block.timestamp
        );

        return patientPrescriptions[patientDataHash];
    }

    // ============ Admin Functions ============

    /**
     * @dev Owner can access any prescription for regulatory purposes
     * @param prescriptionId The prescription ID
     * @return Prescription struct with all details
     */
    function adminGetPrescription(uint256 prescriptionId)
        external
        view
        onlyOwner
        returns (Prescription memory)
    {
        Prescription memory rx = prescriptions[prescriptionId];
        require(rx.prescriptionId != 0, "Prescription does not exist");
        return rx;
    }

    /**
     * @dev Owner can view all prescriptions issued by a doctor
     * @param doctorTokenId The doctor's token ID
     * @return uint256[] Array of prescription IDs
     */
    function adminGetDoctorPrescriptions(uint256 doctorTokenId)
        external
        view
        onlyOwner
        returns (uint256[] memory)
    {
        return doctorPrescriptions[doctorTokenId];
    }

    /**
     * @dev Owner can view all prescriptions dispensed by a pharmacist
     * @param pharmacistTokenId The pharmacist's token ID
     * @return uint256[] Array of prescription IDs
     */
    function adminGetPharmacistDispensals(uint256 pharmacistTokenId)
        external
        view
        onlyOwner
        returns (uint256[] memory)
    {
        return pharmacistDispensals[pharmacistTokenId];
    }

    /**
     * @dev Owner can view all prescriptions for a patient
     * @param patientDataHash The patient's data hash
     * @return uint256[] Array of prescription IDs
     */
    function adminGetPatientPrescriptions(bytes32 patientDataHash)
        external
        view
        onlyOwner
        returns (uint256[] memory)
    {
        return patientPrescriptions[patientDataHash];
    }


    /**
     * @dev Get total number of prescriptions created
     * @return uint256 Total prescription count
     */
    function totalPrescriptions() external view returns (uint256) {
        return _prescriptionIdCounter;
    }
    
    /**
     * @dev Batch check prescription statuses
     * @param prescriptionIds Array of prescription IDs to check
     * @return statuses Array of corresponding statuses
     */
    function batchGetPrescriptionStatus(uint256[] calldata prescriptionIds)
        external
        view
        returns (PrescriptionStatus[] memory statuses)
    {
        statuses = new PrescriptionStatus[](prescriptionIds.length);
        
        for (uint256 i = 0; i < prescriptionIds.length; i++) {
            Prescription memory rx = prescriptions[prescriptionIds[i]];
            
            if (rx.prescriptionId == 0) {
                statuses[i] = PrescriptionStatus.Cancelled; // Use Cancelled for non-existent
            } else if (rx.status == PrescriptionStatus.Active && block.timestamp >= rx.expiresAt) {
                statuses[i] = PrescriptionStatus.Expired;
            } else {
                statuses[i] = rx.status;
            }
        }
        
        return statuses;
    }
}
