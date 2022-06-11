import type { Contract } from "@ethersproject/contracts";
import { expect } from "chai";

import { SushimiFrens as ISushimiFrens } from "../typechain";

import { deployFrens } from "../scripts/deploy";

const ADDRESS = (number: number) =>
  `0x000000000000000000000000000000000000000${number}`;

describe("SushimiFrens", function () {
  let sushimiFrens: ISushimiFrens;
  let baseUri: string;

  beforeEach("", async function () {
    this.timeout(0);
    sushimiFrens = (await deployFrens()) as any;
    baseUri = await sushimiFrens.baseURI();
  });

  it("Shouldn't mint one NFT twice", async function () {
    expect(await sushimiFrens.totalSupply()).to.equal(0);
    await sushimiFrens.mint(ADDRESS(1), "url1");
    expect(await sushimiFrens.totalSupply()).to.equal(1);
    await sushimiFrens.mint(ADDRESS(2), "url2");
    expect(await sushimiFrens.totalSupply()).to.equal(2);

    expect(await sushimiFrens.ownerOf(0)).to.equal(ADDRESS(1));
    expect(await sushimiFrens.ownerOf(1)).to.equal(ADDRESS(2));
  });

  it("IpfsHash changing / freezing mechanism works", async function () {
    await sushimiFrens.mint(ADDRESS(1), "url1");

    let tokenIndex = 0;

    expect(await sushimiFrens.tokenURI(tokenIndex)).to.equal(baseUri + "url1");
    await sushimiFrens.setIpfsHash(tokenIndex, "url2");
    expect(await sushimiFrens.tokenURI(tokenIndex)).to.equal(baseUri + "url2");
    await sushimiFrens.freeze(tokenIndex);
    await expect(
      sushimiFrens.setIpfsHash(tokenIndex, "url3")
    ).to.be.revertedWith("Frozen");

    await sushimiFrens.mint(ADDRESS(2), "url1");

    tokenIndex = 1;

    expect(await sushimiFrens.tokenURI(tokenIndex)).to.equal(baseUri + "url1");
    await sushimiFrens.setIpfsHash(tokenIndex, "url2");
    expect(await sushimiFrens.tokenURI(tokenIndex)).to.equal(baseUri + "url2");
    await sushimiFrens.freeze(tokenIndex);
    await expect(
      sushimiFrens.setIpfsHash(tokenIndex, "url3")
    ).to.be.revertedWith("Frozen");
  });
});
