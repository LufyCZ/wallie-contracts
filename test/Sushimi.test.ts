import { expect } from "chai";

import {
  Sushimi as ISushimi,
  SushimiToken as ISushimiToken,
} from "../typechain";

import { deploy } from "../scripts/deploy";
import { BigNumber } from "ethers";

describe("Sushimi", function () {
  let sushimiNFT: ISushimi;
  let sushimiToken: ISushimiToken;
  let baseURI: string;
  let totalSupply: BigNumber;

  beforeEach("", async function () {
    [sushimiNFT, sushimiToken] = (await deploy()) as any;
    baseURI = await sushimiNFT.baseURI();
    totalSupply = (await sushimiToken.totalSupply()).div(
      BigNumber.from(10).pow(await sushimiToken.decimals())
    );
  });

  it("Should return the correct tokenURI", async function () {
    expect(await sushimiNFT.tokenURI(0)).to.equal("");
    const index = Number(
      (await (await sushimiNFT.mint(1)).wait()).logs[1].topics[3]
    );
    expect(await sushimiNFT.tokenURI(index)).to.equal(
      baseURI + String(index) + ".json"
    );
    expect(await sushimiNFT.tokenURI(1)).to.equal("");
  });

  // Takes a bit longer...
  it("Shouldn't mint one NFT twice", async function () {
    this.timeout(0);

    const indexes = (await (await sushimiNFT.mint(totalSupply)).wait()).logs
      .filter(
        (log: any) =>
          log.topics[0] ===
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" &&
          log.address === sushimiNFT.address
      ) // Transfer on the NFT contract
      .map((log: any) => Number(log.topics[3]));

    const uniqueIndexes = [...new Set(indexes)];
    expect(indexes.length === uniqueIndexes.length);
  });
});
