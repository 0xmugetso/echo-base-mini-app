// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EchoNFT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;
    uint256 public mintPrice = 0.00003 ether;

    constructor(address initialOwner) 
        ERC721("Echo Card", "ECHO") 
        Ownable(initialOwner) 
    {}

    function mint(address to, string memory uri) public payable {
        if (mintPrice > 0) {
            require(msg.value >= mintPrice, "Insufficient payment");
        }
        
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    function setMintPrice(uint256 _price) public onlyOwner {
        mintPrice = _price;
    }

    function withdraw() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
