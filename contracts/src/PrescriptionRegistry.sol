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
        bytes32 patientSecret;           // Secret given to patient for access (hash of random nonce)
    }
    
    // ============ Enums for Multi-Sig ============

    enum AdminActionType {
        AccessPrescription,
        GetDoctorPrescriptions,
        GetPharmacistDispensals,
        AddSigner,
        RemoveSigner
    }

    // ============ Structs for Multi-Sig ============

    struct AdminAction {
        uint256 nonce;
        AdminActionType actionType;
        bytes data;
        uint256 approvalCount;
        bool executed;
        mapping(address => bool) hasApproved;
    }

    // ============ State Variables ============

    MedicalCredentialSBT public immutable credentialSBT;

    // Multi-sig governance
    address[] public signers;
    uint256 public constant REQUIRED_SIGNATURES = 2;
    uint256 private _actionNonce;
    mapping(uint256 => AdminAction) public pendingActions;

    mapping(uint256 => Prescription) internal prescriptions;  // Now internal for privacy
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

    event AdminActionProposed(
        uint256 indexed actionNonce,
        AdminActionType actionType,
        address indexed proposer
    );

    event AdminActionApproved(
        uint256 indexed actionNonce,
        address indexed signer,
        uint256 approvalCount
    );

    event AdminActionExecuted(
        uint256 indexed actionNonce,
        AdminActionType actionType
    );

    event SignerAdded(
        address indexed signer
    );

    event SignerRemoved(
        address indexed signer
    );

    // ============ Modifiers ============

    modifier onlySigner() {
        bool _isSigner = false;
        for (uint256 i = 0; i < signers.length; i++) {
            if (signers[i] == msg.sender) {
                _isSigner = true;
                break;
            }
        }
        require(_isSigner, "Not a signer");
        _;
    }

    modifier onlyMultiSig(uint256 actionNonce) {
        AdminAction storage action = pendingActions[actionNonce];
        require(action.approvalCount >= REQUIRED_SIGNATURES, "Insufficient signatures");
        require(!action.executed, "Already executed");
        _;
        action.executed = true;
    }

    // ============ Constructor ============

    constructor(address _credentialSBT, address[] memory _signers) {
        require(_credentialSBT != address(0), "Invalid SBT address");
        require(_signers.length >= REQUIRED_SIGNATURES, "Not enough signers");

        credentialSBT = MedicalCredentialSBT(_credentialSBT);
        signers = _signers;
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

    // ============ Multi-Sig Governance Functions ============

    /**
     * @dev Propose an admin action (signer-only)
     * @param actionType The type of action to propose
     * @param data Encoded action data
     * @return actionNonce The nonce of the proposed action
     */
    function proposeAdminAction(AdminActionType actionType, bytes calldata data)
        external
        onlySigner
        returns (uint256)
    {
        _actionNonce++;
        uint256 nonce = _actionNonce;

        AdminAction storage action = pendingActions[nonce];
        action.nonce = nonce;
        action.actionType = actionType;
        action.data = data;
        action.approvalCount = 1;  // Proposer auto-approves
        action.executed = false;
        action.hasApproved[msg.sender] = true;

        emit AdminActionProposed(nonce, actionType, msg.sender);
        emit AdminActionApproved(nonce, msg.sender, 1);

        return nonce;
    }

    /**
     * @dev Approve a pending admin action (signer-only)
     * @param actionNonce The nonce of the action to approve
     */
    function approveAdminAction(uint256 actionNonce) external onlySigner {
        AdminAction storage action = pendingActions[actionNonce];
        require(action.nonce != 0, "Action does not exist");
        require(!action.executed, "Action already executed");
        require(!action.hasApproved[msg.sender], "Already approved");

        action.hasApproved[msg.sender] = true;
        action.approvalCount++;

        emit AdminActionApproved(actionNonce, msg.sender, action.approvalCount);
    }

    /**
     * @dev Execute approved action to get prescription (multi-sig required)
     * @param actionNonce The nonce of the approved action
     * @return Prescription struct with all details
     */
    function executeGetPrescription(uint256 actionNonce)
        external
        onlyMultiSig(actionNonce)
        returns (Prescription memory)
    {
        AdminAction storage action = pendingActions[actionNonce];
        require(action.actionType == AdminActionType.AccessPrescription, "Wrong action type");

        uint256 prescriptionId = abi.decode(action.data, (uint256));
        Prescription memory rx = prescriptions[prescriptionId];
        require(rx.prescriptionId != 0, "Prescription does not exist");

        emit AdminActionExecuted(actionNonce, AdminActionType.AccessPrescription);
        return rx;
    }

    /**
     * @dev Execute approved action to get doctor prescriptions (multi-sig required)
     * @param actionNonce The nonce of the approved action
     * @return uint256[] Array of prescription IDs
     */
    function executeGetDoctorPrescriptions(uint256 actionNonce)
        external
        onlyMultiSig(actionNonce)
        returns (uint256[] memory)
    {
        AdminAction storage action = pendingActions[actionNonce];
        require(action.actionType == AdminActionType.GetDoctorPrescriptions, "Wrong action type");

        uint256 doctorTokenId = abi.decode(action.data, (uint256));

        emit AdminActionExecuted(actionNonce, AdminActionType.GetDoctorPrescriptions);
        return doctorPrescriptions[doctorTokenId];
    }

    /**
     * @dev Execute approved action to get pharmacist dispensals (multi-sig required)
     * @param actionNonce The nonce of the approved action
     * @return uint256[] Array of prescription IDs
     */
    function executeGetPharmacistDispensals(uint256 actionNonce)
        external
        onlyMultiSig(actionNonce)
        returns (uint256[] memory)
    {
        AdminAction storage action = pendingActions[actionNonce];
        require(action.actionType == AdminActionType.GetPharmacistDispensals, "Wrong action type");

        uint256 pharmacistTokenId = abi.decode(action.data, (uint256));

        emit AdminActionExecuted(actionNonce, AdminActionType.GetPharmacistDispensals);
        return pharmacistDispensals[pharmacistTokenId];
    }

    /**
     * @dev Execute approved action to add a new signer (multi-sig required)
     * @param actionNonce The nonce of the approved action
     */
    function executeAddSigner(uint256 actionNonce) external onlyMultiSig(actionNonce) {
        AdminAction storage action = pendingActions[actionNonce];
        require(action.actionType == AdminActionType.AddSigner, "Wrong action type");

        address newSigner = abi.decode(action.data, (address));
        require(newSigner != address(0), "Invalid signer address");

        // Check not already a signer
        for (uint256 i = 0; i < signers.length; i++) {
            require(signers[i] != newSigner, "Already a signer");
        }

        signers.push(newSigner);

        emit AdminActionExecuted(actionNonce, AdminActionType.AddSigner);
        emit SignerAdded(newSigner);
    }

    /**
     * @dev Execute approved action to remove a signer (multi-sig required)
     * @param actionNonce The nonce of the approved action
     */
    function executeRemoveSigner(uint256 actionNonce) external onlyMultiSig(actionNonce) {
        AdminAction storage action = pendingActions[actionNonce];
        require(action.actionType == AdminActionType.RemoveSigner, "Wrong action type");

        address signerToRemove = abi.decode(action.data, (address));
        require(signers.length > REQUIRED_SIGNATURES, "Cannot remove - would go below threshold");

        // Find and remove signer
        bool found = false;
        for (uint256 i = 0; i < signers.length; i++) {
            if (signers[i] == signerToRemove) {
                signers[i] = signers[signers.length - 1];
                signers.pop();
                found = true;
                break;
            }
        }
        require(found, "Signer not found");

        emit AdminActionExecuted(actionNonce, AdminActionType.RemoveSigner);
        emit SignerRemoved(signerToRemove);
    }

    /**
     * @dev Get number of signers
     * @return uint256 Current number of signers
     */
    function getSignerCount() external view returns (uint256) {
        return signers.length;
    }

    /**
     * @dev Check if address is a signer
     * @param account Address to check
     * @return bool True if account is a signer
     */
    function isSigner(address account) external view returns (bool) {
        for (uint256 i = 0; i < signers.length; i++) {
            if (signers[i] == account) {
                return true;
            }
        }
        return false;
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
