// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MedicalCredentialSBT
 * @dev Soul-Bound Token for verified medical professionals (doctors and pharmacists)
 * @notice This contract issues non-transferable credentials to verified healthcare providers
 */
contract MedicalCredentialSBT is ERC721, Ownable {
    
    // ============ Enums ============
    
    enum CredentialType { Doctor, Pharmacist }
    
    // ============ Structs ============
    
    struct Credential {
        CredentialType credentialType;
        string licenseHash;        // Hash of license number (for privacy)
        string specialty;          // e.g., "Cardiology", "Retail Pharmacy"
        string metadataURI;        // IPFS CID with full profile
        uint256 issuedAt;         // Timestamp of issuance
        uint256 expiresAt;        // Credential expiry timestamp
        bool isActive;            // Can be revoked by owner
        address holder;           // Wallet address of credential holder
    }
    
    // ============ State Variables ============
    
    mapping(uint256 => Credential) public credentials;
    mapping(address => uint256) public holderToTokenId;  // 1 credential per address
    uint256 private _tokenIdCounter;
    
    // ============ Events ============
    
    event CredentialIssued(
        uint256 indexed tokenId,
        address indexed holder,
        CredentialType credentialType,
        string specialty,
        string metadataURI,
        uint256 expiresAt
    );
    
    event CredentialRevoked(
        uint256 indexed tokenId,
        address indexed holder,
        uint256 revokedAt
    );
    
    event CredentialReactivated(
        uint256 indexed tokenId,
        address indexed holder,
        uint256 reactivatedAt
    );
    
    event CredentialExpiryUpdated(
        uint256 indexed tokenId,
        uint256 oldExpiry,
        uint256 newExpiry
    );
    
    // ============ Constructor ============
    
    constructor() ERC721("MedChain Credential", "MEDCRED") Ownable(msg.sender) {}
    
    // ============ External Functions ============
    
    /**
     * @dev Issue a credential to a verified medical professional
     * @param holder The wallet address receiving the credential
     * @param credentialType Doctor (0) or Pharmacist (1)
     * @param licenseHash Hashed license number for privacy
     * @param specialty Professional specialty
     * @param metadataURI IPFS CID containing full profile data
     * @param validityYears How many years the credential is valid
     * @return tokenId The ID of the newly minted credential
     */
    function issueCredential(
        address holder,
        CredentialType credentialType,
        string memory licenseHash,
        string memory specialty,
        string memory metadataURI,
        uint256 validityYears
    ) external onlyOwner returns (uint256) {
        require(holder != address(0), "Invalid holder address");
        require(holderToTokenId[holder] == 0, "Holder already has credential");
        require(bytes(licenseHash).length > 0, "License hash required");
        require(bytes(metadataURI).length > 0, "Metadata URI required");
        require(validityYears > 0 && validityYears <= 10, "Invalid validity period");
        
        _tokenIdCounter++;
        uint256 newTokenId = _tokenIdCounter;
        
        uint256 expiryTimestamp = block.timestamp + (validityYears * 365 days);
        
        _safeMint(holder, newTokenId);
        
        credentials[newTokenId] = Credential({
            credentialType: credentialType,
            licenseHash: licenseHash,
            specialty: specialty,
            metadataURI: metadataURI,
            issuedAt: block.timestamp,
            expiresAt: expiryTimestamp,
            isActive: true,
            holder: holder
        });
        
        holderToTokenId[holder] = newTokenId;
        
        emit CredentialIssued(
            newTokenId,
            holder,
            credentialType,
            specialty,
            metadataURI,
            expiryTimestamp
        );
        
        return newTokenId;
    }
    
    /**
     * @dev Revoke a credential (e.g., license suspended, fraud detected)
     * @param tokenId The credential token ID to revoke
     */
    function revokeCredential(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        require(credentials[tokenId].isActive, "Credential already revoked");
        
        credentials[tokenId].isActive = false;
        
        emit CredentialRevoked(
            tokenId,
            credentials[tokenId].holder,
            block.timestamp
        );
    }
    
    /**
     * @dev Reactivate a previously revoked credential
     * @param tokenId The credential token ID to reactivate
     */
    function reactivateCredential(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        require(!credentials[tokenId].isActive, "Credential already active");
        
        credentials[tokenId].isActive = true;
        
        emit CredentialReactivated(
            tokenId,
            credentials[tokenId].holder,
            block.timestamp
        );
    }
    
    /**
     * @dev Update credential expiry date (e.g., license renewed)
     * @param tokenId The credential token ID
     * @param newExpiryTimestamp New expiry timestamp
     */
    function updateExpiry(uint256 tokenId, uint256 newExpiryTimestamp) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        require(newExpiryTimestamp > block.timestamp, "Expiry must be in future");
        
        uint256 oldExpiry = credentials[tokenId].expiresAt;
        credentials[tokenId].expiresAt = newExpiryTimestamp;
        
        emit CredentialExpiryUpdated(tokenId, oldExpiry, newExpiryTimestamp);
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Check if a credential is valid (active AND not expired)
     * @param tokenId The credential token ID
     * @return bool True if credential is valid
     */
    function isCredentialValid(uint256 tokenId) public view returns (bool) {
        if (_ownerOf(tokenId) == address(0)) return false;
        
        Credential memory cred = credentials[tokenId];
        return cred.isActive && block.timestamp < cred.expiresAt;
    }
    
    /**
     * @dev Check if an address has a valid credential of a specific type
     * @param holder The wallet address to check
     * @param credType The credential type to verify
     * @return bool True if holder has valid credential of specified type
     */
    function hasValidCredential(address holder, CredentialType credType) 
        external 
        view 
        returns (bool) 
    {
        uint256 tokenId = holderToTokenId[holder];
        if (tokenId == 0) return false;
        
        Credential memory cred = credentials[tokenId];
        return cred.credentialType == credType && isCredentialValid(tokenId);
    }
    
    /**
     * @dev Get full credential details
     * @param tokenId The credential token ID
     * @return Credential struct with all details
     */
    function getCredential(uint256 tokenId) 
        external 
        view 
        returns (Credential memory) 
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return credentials[tokenId];
    }
    
    /**
     * @dev Get token URI (points to IPFS metadata)
     * @param tokenId The credential token ID
     * @return string IPFS URI
     */
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override 
        returns (string memory) 
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return string(abi.encodePacked("ipfs://", credentials[tokenId].metadataURI));
    }
    
    /**
     * @dev Get current total supply of credentials
     * @return uint256 Total credentials issued
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }
    
    // ============ Internal Functions ============
    
    /**
     * @dev Override _update to make tokens non-transferable (soul-bound)
     * @notice Allows minting (from = 0) and burning (to = 0), but not transfers
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        
        // Allow minting and burning, but not transfers between addresses
        require(
            from == address(0) || to == address(0),
            "SBT: Credentials are non-transferable"
        );
        
        return super._update(to, tokenId, auth);
    }
}
