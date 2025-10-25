// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {MedicalCredentialSBT} from "./MedicalCredentialSBT.sol";

/**
 * @title PrescriptionRegistry
 * @dev Manages prescription lifecycle without requiring patient blockchain interaction
 * @notice Doctors create prescriptions, pharmacists dispense them. All verified via SBTs.
 */
contract PrescriptionRegistry {
    
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
    }
    
    // ============ State Variables ============

    MedicalCredentialSBT public immutable credentialSBT;
    address public admin;  // For regulatory/compliance access

    mapping(uint256 => Prescription) public prescriptions;
    uint256 private _prescriptionIdCounter;

    // Audit trail mappings (internal for privacy)
    mapping(uint256 => uint256[]) internal doctorPrescriptions;      // doctorTokenId => prescriptionIds[]
    mapping(uint256 => uint256[]) internal pharmacistDispensals;     // pharmacistTokenId => prescriptionIds[]
    
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

    event AdminChanged(
        address indexed previousAdmin,
        address indexed newAdmin
    );

    // ============ Modifiers ============

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }

    // ============ Constructor ============

    constructor(address _credentialSBT) {
        require(_credentialSBT != address(0), "Invalid SBT address");
        credentialSBT = MedicalCredentialSBT(_credentialSBT);
        admin = msg.sender;  // Deployer is initial admin
    }
    
    // ============ External Functions ============
    
    /**
     * @dev Doctor creates a new prescription
     * @param patientDataHash SHA-256 hash of patient info (name, DOB, ID)
     * @param prescriptionDataHash SHA-256 hash of medication details
     * @param ipfsCid IPFS content identifier for encrypted prescription data
     * @param validityDays Number of days the prescription is valid
     * @return prescriptionId The ID of the newly created prescription
     */
    function createPrescription(
        bytes32 patientDataHash,
        bytes32 prescriptionDataHash,
        string calldata ipfsCid,
        uint256 validityDays
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
            pharmacistTokenId: 0
        });
        
        doctorPrescriptions[doctorTokenId].push(newPrescriptionId);
        
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
    
    // ============ View Functions ============
    
    /**
     * @dev Get prescription details
     * @param prescriptionId The prescription ID
     * @return Prescription struct with all details
     */
    function getPrescription(uint256 prescriptionId)
        external
        view
        returns (Prescription memory)
    {
        require(prescriptions[prescriptionId].prescriptionId != 0, "Prescription does not exist");
        return prescriptions[prescriptionId];
    }
    
    /**
     * @dev Get prescription details (individual fields for easier frontend integration)
     * @param prescriptionId The prescription ID
     */
    function getPrescriptionDetails(uint256 prescriptionId)
        external
        view
        returns (
            uint256 doctorTokenId,
            bytes32 patientDataHash,
            bytes32 prescriptionDataHash,
            string memory ipfsCid,
            PrescriptionStatus status,
            uint256 issuedAt,
            uint256 expiresAt,
            uint256 dispensedAt,
            uint256 pharmacistTokenId
        )
    {
        Prescription memory rx = prescriptions[prescriptionId];
        require(rx.prescriptionId != 0, "Prescription does not exist");
        
        return (
            rx.doctorTokenId,
            rx.patientDataHash,
            rx.prescriptionDataHash,
            rx.ipfsCid,
            rx.status,
            rx.issuedAt,
            rx.expiresAt,
            rx.dispensedAt,
            rx.pharmacistTokenId
        );
    }
    
    /**
     * @dev Check if prescription is currently dispensable
     * @param prescriptionId The prescription ID
     * @return bool True if prescription can be dispensed right now
     */
    function isPrescriptionDispensable(uint256 prescriptionId)
        external
        view
        returns (bool)
    {
        Prescription memory rx = prescriptions[prescriptionId];
        
        if (rx.prescriptionId == 0) return false;
        if (rx.status != PrescriptionStatus.Active) return false;
        if (block.timestamp >= rx.expiresAt) return false;
        
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
     * @dev Get all prescriptions issued by a doctor (admin-only for auditing)
     * @param doctorTokenId The doctor's SBT token ID
     * @return uint256[] Array of prescription IDs
     */
    function getDoctorPrescriptions(uint256 doctorTokenId)
        external
        view
        onlyAdmin
        returns (uint256[] memory)
    {
        return doctorPrescriptions[doctorTokenId];
    }

    /**
     * @dev Get all prescriptions dispensed by a pharmacist (admin-only for auditing)
     * @param pharmacistTokenId The pharmacist's SBT token ID
     * @return uint256[] Array of prescription IDs
     */
    function getPharmacistDispensals(uint256 pharmacistTokenId)
        external
        view
        onlyAdmin
        returns (uint256[] memory)
    {
        return pharmacistDispensals[pharmacistTokenId];
    }

    /**
     * @dev Set new admin address (admin-only)
     * @param newAdmin The new admin address
     */
    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid admin address");
        address previousAdmin = admin;
        admin = newAdmin;
        emit AdminChanged(previousAdmin, newAdmin);
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
