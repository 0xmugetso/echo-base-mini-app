// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EchoHighlightNFT
 * @notice A Highlight-compatible NFT contract for Echo Cards.
 * @dev Optimized for sequential minting and self-hosted metadata.
 */
contract EchoHighlightNFT is ERC721, Ownable {
    uint256 private _nextTokenId;
    string private _baseTokenURI;
    string public contractURI;
    mapping(address => bool) public minters;

    // Highlight-style Events for Indexing
    event Minted(address indexed to, uint256 indexed tokenId);
    event BaseURISet(string newBaseURI);
    event ContractURISet(string newContractURI);
    event MinterStatusSet(address indexed minter, bool status);

    modifier onlyMinter() {
        require(minters[msg.sender] || owner() == msg.sender, "Not minter");
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI_,
        string memory initialContractURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _baseTokenURI = baseURI_;
        contractURI = initialContractURI;
        _nextTokenId = 1; // Start from 1
        minters[msg.sender] = true;
    }

    /**
     * @notice Toggle minter status
     */
    function setMinterStatus(address minter, bool status) external onlyOwner {
        minters[minter] = status;
        emit MinterStatusSet(minter, status);
    }

    /**
     * @notice Set base URI for metadata
     */
    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
        emit BaseURISet(newBaseURI);
    }

    /**
     * @notice Set contract-level metadata URI
     */
    function setContractURI(string memory newContractURI) external onlyOwner {
        contractURI = newContractURI;
        emit ContractURISet(newContractURI);
    }

    /**
     * @notice Internal function to return base URI
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @notice Mint next card to recipient
     * @dev Public minting allowed, but internal sequence ensures unique IDs
     */
    function mint(address to) external returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        emit Minted(to, tokenId);
        return tokenId;
    }

    /**
     * @notice Multi-mint (Highlight General Style)
     */
    function mintMany(address to, uint256 amount) external onlyMinter {
        for (uint256 i = 0; i < amount; i++) {
            uint256 tokenId = _nextTokenId++;
            _mint(to, tokenId);
            emit Minted(to, tokenId);
        }
    }

    /**
     * @notice Emergency withdraw
     */
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
