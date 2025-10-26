// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ApplicationRegistry
 * @dev Manages healthcare provider credential applications with IPFS storage
 * @notice Wallet-based application system - providers apply with connected wallet
 *
 * Privacy Model:
 * - On-chain: IPFS CID, wallet address, status
 * - IPFS: Full application data including PLAINTEXT license numbers
 * - License numbers stored in plaintext for admin verification against state databases
 * - IPFS CIDs are private (only accessible to those who have the CID)
 * - Data kept indefinitely for audit trail and compliance
 */
contract ApplicationRegistry is Ownable {
    // Application status enum
    enum ApplicationStatus {
        Pending,
        Approved,
        Rejected,
        CredentialIssued
    }

    // Credential type (must match MedicalCredentialSBT)
    enum CredentialType {
        Doctor,
        Pharmacist
    }

    // Application structure
    struct Application {
        uint256 applicationId;
        address applicant; // Wallet address of applicant (msg.sender)
        string ipfsCid; // IPFS CID containing full application data
        CredentialType credentialType;
        ApplicationStatus status;
        uint256 submittedAt;
        uint256 reviewedAt;
        address reviewedBy; // Admin who reviewed
        uint256 credentialTokenId; // SBT token ID (set when credential issued)
        string rejectionReason; // Optional reason if rejected
    }

    // State variables
    mapping(uint256 => Application) public applications;
    mapping(address => uint256) public applicantToApplication; // One application per wallet

    uint256 private _applicationIdCounter;

    // Events
    event ApplicationSubmitted(
        uint256 indexed applicationId,
        address indexed applicant,
        string ipfsCid,
        CredentialType credentialType,
        uint256 timestamp
    );

    event ApplicationApproved(
        uint256 indexed applicationId,
        address indexed applicant,
        address indexed approvedBy,
        uint256 timestamp
    );

    event ApplicationRejected(
        uint256 indexed applicationId,
        address indexed applicant,
        address indexed rejectedBy,
        string reason,
        uint256 timestamp
    );

    event CredentialLinked(
        uint256 indexed applicationId,
        uint256 indexed credentialTokenId,
        address indexed applicant,
        uint256 timestamp
    );

    event ApplicationUpdated(
        uint256 indexed applicationId,
        string newIpfsCid,
        uint256 timestamp
    );

    constructor() Ownable(msg.sender) {
        _applicationIdCounter = 1; // Start from 1
    }

    /**
     * @dev Internal function to create an application
     */
    function _createApplication(
        string memory ipfsCid,
        CredentialType credentialType
    ) internal returns (uint256) {
        require(bytes(ipfsCid).length > 0, "IPFS CID required");

        uint256 applicationId = _applicationIdCounter++;

        applications[applicationId] = Application({
            applicationId: applicationId,
            applicant: msg.sender,
            ipfsCid: ipfsCid,
            credentialType: credentialType,
            status: ApplicationStatus.Pending,
            submittedAt: block.timestamp,
            reviewedAt: 0,
            reviewedBy: address(0),
            credentialTokenId: 0,
            rejectionReason: ""
        });

        applicantToApplication[msg.sender] = applicationId;

        emit ApplicationSubmitted(
            applicationId,
            msg.sender,
            ipfsCid,
            credentialType,
            block.timestamp
        );

        return applicationId;
    }

    /**
     * @dev Submit a new application (requires connected wallet)
     * @param ipfsCid IPFS CID containing encrypted application data
     * @param credentialType Type of credential requested (Doctor/Pharmacist)
     */
    function submitApplication(
        string memory ipfsCid,
        CredentialType credentialType
    ) external returns (uint256) {
        require(applicantToApplication[msg.sender] == 0, "Application already exists for this wallet");
        return _createApplication(ipfsCid, credentialType);
    }

    /**
     * @dev Approve an application (admin only)
     * @param applicationId ID of application to approve
     */
    function approveApplication(uint256 applicationId) external onlyOwner {
        Application storage app = applications[applicationId];
        require(app.submittedAt > 0, "Application does not exist");
        require(app.status == ApplicationStatus.Pending, "Application already reviewed");

        app.status = ApplicationStatus.Approved;
        app.reviewedAt = block.timestamp;
        app.reviewedBy = msg.sender;

        emit ApplicationApproved(
            applicationId,
            app.applicant,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @dev Reject an application (admin only)
     * @param applicationId ID of application to reject
     * @param reason Reason for rejection
     */
    function rejectApplication(
        uint256 applicationId,
        string memory reason
    ) external onlyOwner {
        Application storage app = applications[applicationId];
        require(app.submittedAt > 0, "Application does not exist");
        require(app.status == ApplicationStatus.Pending, "Application already reviewed");

        app.status = ApplicationStatus.Rejected;
        app.reviewedAt = block.timestamp;
        app.reviewedBy = msg.sender;
        app.rejectionReason = reason;

        emit ApplicationRejected(
            applicationId,
            app.applicant,
            msg.sender,
            reason,
            block.timestamp
        );
    }

    /**
     * @dev Link issued credential to application (admin only)
     * @param applicationId ID of approved application
     * @param credentialTokenId Token ID of issued SBT
     */
    function linkCredentialToApplication(
        uint256 applicationId,
        uint256 credentialTokenId
    ) external onlyOwner {
        Application storage app = applications[applicationId];
        require(app.submittedAt > 0, "Application does not exist");
        require(app.status == ApplicationStatus.Approved, "Application not approved");

        app.status = ApplicationStatus.CredentialIssued;
        app.credentialTokenId = credentialTokenId;

        emit CredentialLinked(
            applicationId,
            credentialTokenId,
            app.applicant,
            block.timestamp
        );
    }

    /**
     * @dev Update application IPFS CID (applicant can update before review)
     * @param newIpfsCid New IPFS CID with updated data
     */
    function updateApplicationData(string memory newIpfsCid) external {
        uint256 applicationId = applicantToApplication[msg.sender];
        require(applicationId > 0, "No application found for sender");

        Application storage app = applications[applicationId];
        require(
            app.status == ApplicationStatus.Pending,
            "Cannot update reviewed application"
        );

        app.ipfsCid = newIpfsCid;

        emit ApplicationUpdated(applicationId, newIpfsCid, block.timestamp);
    }

    /**
     * @dev Admin can also update application data
     * @param applicationId ID of application to update
     * @param newIpfsCid New IPFS CID with updated data
     */
    function adminUpdateApplicationData(
        uint256 applicationId,
        string memory newIpfsCid
    ) external onlyOwner {
        Application storage app = applications[applicationId];
        require(app.submittedAt > 0, "Application does not exist");

        app.ipfsCid = newIpfsCid;

        emit ApplicationUpdated(applicationId, newIpfsCid, block.timestamp);
    }

    /**
     * @dev Allow reapplication after rejection
     * @param ipfsCid New IPFS CID for reapplication
     * @param credentialType Credential type (can be same or different)
     */
    function reapply(
        string memory ipfsCid,
        CredentialType credentialType
    ) external returns (uint256) {
        uint256 oldApplicationId = applicantToApplication[msg.sender];

        if (oldApplicationId > 0) {
            Application storage oldApp = applications[oldApplicationId];
            require(
                oldApp.status == ApplicationStatus.Rejected,
                "Can only reapply after rejection"
            );

            // Clear old application mapping
            applicantToApplication[msg.sender] = 0;
        }

        // Create new application
        return _createApplication(ipfsCid, credentialType);
    }

    // View functions

    /**
     * @dev Get application by ID
     */
    function getApplication(uint256 applicationId)
        external
        view
        returns (Application memory)
    {
        require(applications[applicationId].submittedAt > 0, "Application does not exist");
        return applications[applicationId];
    }

    /**
     * @dev Get application by wallet address
     */
    function getApplicationByApplicant(address applicant)
        external
        view
        returns (Application memory)
    {
        uint256 applicationId = applicantToApplication[applicant];
        require(applicationId > 0, "No application found for this address");
        return applications[applicationId];
    }

    /**
     * @dev Check if wallet has an application
     */
    function hasApplication(address applicant) external view returns (bool) {
        return applicantToApplication[applicant] > 0;
    }

    /**
     * @dev Get application ID for a wallet
     */
    function getApplicationId(address applicant) external view returns (uint256) {
        return applicantToApplication[applicant];
    }

    /**
     * @dev Get total number of applications
     */
    function getTotalApplications() external view returns (uint256) {
        return _applicationIdCounter - 1;
    }

    /**
     * @dev Get applications by status (for admin dashboard)
     * @notice Returns application IDs, not full application data (gas optimization)
     */
    function getApplicationIdsByStatus(
        ApplicationStatus status,
        uint256 limit,
        uint256 offset
    ) external view returns (uint256[] memory, uint256) {
        // First pass: count matching applications
        uint256 count = 0;
        uint256 total = _applicationIdCounter - 1;

        for (uint256 i = 1; i <= total; i++) {
            if (applications[i].status == status) {
                count++;
            }
        }

        // Apply pagination
        uint256 startIndex = offset;
        uint256 endIndex = offset + limit;
        if (endIndex > count) {
            endIndex = count;
        }

        uint256 resultSize = endIndex > startIndex ? endIndex - startIndex : 0;
        uint256[] memory result = new uint256[](resultSize);

        // Second pass: collect matching application IDs with pagination
        uint256 matchIndex = 0;
        uint256 resultIndex = 0;

        for (uint256 i = 1; i <= total && resultIndex < resultSize; i++) {
            if (applications[i].status == status) {
                if (matchIndex >= startIndex && matchIndex < endIndex) {
                    result[resultIndex] = i;
                    resultIndex++;
                }
                matchIndex++;
            }
        }

        return (result, count);
    }
}
