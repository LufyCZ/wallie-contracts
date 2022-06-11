import { ethers } from "hardhat";
import type { Contract } from "ethers";

export const BASE_URI =
  "https://sushimi-test.s3.eu-central-1.amazonaws.com/metadata/";
//"ipfs://bafybeietnjm2d7346xtcbn7tuqawkvdnbrll7z5drejygzbkzeynig2ixm/";

export async function deploy(): Promise<Contract[]> {
  const Token = await ethers.getContractFactory("SushimiToken");
  const TokenContract = await Token.deploy();

  const NFT = await ethers.getContractFactory("Sushimi");
  const NFTcontract = await NFT.deploy(BASE_URI, TokenContract.address);

  await TokenContract.functions.transferOwnership(NFTcontract.address);

  return [NFTcontract, TokenContract];
}

export async function deployFrens(): Promise<Contract> {
  const SushimiFrens = await ethers.getContractFactory("SushimiFrens");
  const SushimiFrensContract = await SushimiFrens.deploy();

  return SushimiFrensContract;
}
