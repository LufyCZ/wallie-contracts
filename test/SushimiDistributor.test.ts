import hre, { ethers, deployments } from "hardhat";
import { expect } from "chai";

import {
  SushimiDistributor as ISushimiDistributor,
  SushimiToken as ISushimiToken,
} from "../typechain";

import { deploy } from "../scripts/deploy";
import { BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { parseBalanceMap } from "../scripts/merkle/parse-balance-map";

const MERKLE_PRICE = BigNumber.from(3).mul(BigInt(1e16));
const PUBLIC_PRICE = BigNumber.from(5).mul(BigInt(1e16));

describe("SushimiDistributor", function () {
  let fixture: any;

  let SushimiToken: ISushimiToken;
  let SushimiDistributor: ISushimiDistributor;

  let [Owner, BuyerReg, BuyerMerkle1, BuyerMerkle2]: SignerWithAddress[] = [];

  let merkleTree: ReturnType<typeof parseBalanceMap>;

  before("", async function () {
    [Owner, BuyerReg, BuyerMerkle1, BuyerMerkle2] = await ethers.getSigners();

    merkleTree = parseBalanceMap({
      [BuyerMerkle1.address]: "0x" + (5).toString(16),
      [BuyerMerkle2.address]: "0x" + (10).toString(16),
    });

    fixture = deployments.createFixture(async () => {
      await deployments.fixture(["SushimiDistributor"], {
        keepExistingDeployments: true,
      });

      const sushimiToken = (await (
        await ethers.getContractFactory("SushimiToken")
      ).deploy()) as ISushimiToken;
      const sushimiDistributor = (await (
        await ethers.getContractFactory("SushimiDistributor")
      ).deploy(
        sushimiToken.address,
        merkleTree.merkleRoot
      )) as ISushimiDistributor;

      await sushimiToken.transfer(
        sushimiDistributor.address,
        BigInt(5000 * 1e18)
      );

      return { sushimiToken, sushimiDistributor };
    });
  });

  beforeEach("", async function () {
    ({ sushimiToken: SushimiToken, sushimiDistributor: SushimiDistributor } =
      await fixture());
  });

  it("Regular buy correct", async function () {
    const amount = 2;

    expect(await SushimiToken.balanceOf(BuyerReg.address)).to.equal(0);
    await SushimiDistributor.connect(BuyerReg).buy(amount, {
      value: PUBLIC_PRICE.mul(amount),
    });
    expect(await SushimiToken.balanceOf(BuyerReg.address)).to.equal(
      BigNumber.from(BigInt(1e18)).mul(amount)
    );
  });

  it("Regular buy a lot", async function () {
    const amount = 20;

    expect(await SushimiToken.balanceOf(BuyerReg.address)).to.equal(0);
    await SushimiDistributor.connect(BuyerReg).buy(amount, {
      value: PUBLIC_PRICE.mul(amount),
    });
    expect(await SushimiToken.balanceOf(BuyerReg.address)).to.equal(
      BigNumber.from(BigInt(1e18)).mul(amount)
    );
  });

  it("Regular buy incorrect", async function () {
    const amount = 2;

    expect(await SushimiToken.balanceOf(BuyerReg.address)).to.equal(0);
    await expect(
      SushimiDistributor.connect(BuyerReg).buy(amount, {
        value: PUBLIC_PRICE,
      })
    ).to.be.revertedWith("Insufficient value");
    expect(await SushimiToken.balanceOf(BuyerReg.address)).to.equal(0);
  });

  it("Merkle buy correct", async function () {
    let claim = merkleTree.claims[BuyerMerkle1.address];
    let amount = parseInt(claim.amount, 16);

    expect(await SushimiToken.balanceOf(BuyerMerkle1.address)).to.equal(0);
    await SushimiDistributor.connect(BuyerMerkle1).buyMerkle(
      claim.index,
      BuyerMerkle1.address,
      claim.amount,
      claim.proof,
      amount,
      {
        value: MERKLE_PRICE.mul(amount),
      }
    );
    expect(await SushimiToken.balanceOf(BuyerMerkle1.address)).to.equal(
      BigInt(amount * 1e18)
    );
    expect(
      await SushimiDistributor.boughtAmounts(BuyerMerkle1.address)
    ).to.equal(amount);

    claim = merkleTree.claims[BuyerMerkle2.address];
    amount = parseInt(claim.amount, 16);

    expect(await SushimiToken.balanceOf(BuyerMerkle2.address)).to.equal(0);
    await SushimiDistributor.connect(BuyerMerkle2).buyMerkle(
      claim.index,
      BuyerMerkle2.address,
      claim.amount,
      claim.proof,
      amount,
      {
        value: MERKLE_PRICE.mul(amount),
      }
    );
    expect(await SushimiToken.balanceOf(BuyerMerkle2.address)).to.equal(
      BigInt(amount * 1e18)
    );
    expect(
      await SushimiDistributor.boughtAmounts(BuyerMerkle2.address)
    ).to.equal(amount);
  });

  it("Merkle buy incorrect", async function () {
    let claim = merkleTree.claims[BuyerMerkle1.address];
    let amount = parseInt(claim.amount, 16) + 1;

    expect(await SushimiToken.balanceOf(BuyerMerkle1.address)).to.equal(0);
    await expect(
      SushimiDistributor.connect(BuyerMerkle1).buyMerkle(
        claim.index,
        BuyerMerkle1.address,
        claim.amount,
        claim.proof,
        amount,
        {
          value: MERKLE_PRICE.mul(amount),
        }
      )
    ).to.be.revertedWith("Bought too many");
    expect(await SushimiToken.balanceOf(BuyerMerkle1.address)).to.equal(0);
    expect(
      await SushimiDistributor.boughtAmounts(BuyerMerkle1.address)
    ).to.equal(0);

    claim = merkleTree.claims[BuyerMerkle1.address];
    amount = parseInt(claim.amount, 16);

    await SushimiDistributor.connect(BuyerMerkle1).buyMerkle(
      claim.index,
      BuyerMerkle1.address,
      claim.amount,
      claim.proof,
      amount,
      {
        value: MERKLE_PRICE.mul(amount),
      }
    );

    amount = 1;

    await expect(
      SushimiDistributor.connect(BuyerMerkle1).buyMerkle(
        claim.index,
        BuyerMerkle1.address,
        claim.amount,
        claim.proof,
        amount,
        {
          value: MERKLE_PRICE.mul(amount),
        }
      )
    ).to.be.revertedWith("Bought too many");
  });

  it("Rescue", async function () {
    const contractBalance = await SushimiToken.balanceOf(
      SushimiDistributor.address
    );
    const balanceBefore = await SushimiToken.balanceOf(Owner.address);

    await SushimiDistributor.rescue();

    const balanceAfter = await SushimiToken.balanceOf(Owner.address);

    expect(balanceAfter.sub(contractBalance)).to.be.equal(balanceBefore);
  });

  it("Withdraw", async function () {
    const balanceBefore = await Owner.getBalance();

    await SushimiDistributor.connect(BuyerReg).buy(1, {
      value: PUBLIC_PRICE,
    });

    await SushimiDistributor.withdraw();

    const balanceAfter = await Owner.getBalance();

    expect(balanceAfter.sub(PUBLIC_PRICE)).to.be.equal(balanceBefore);
  });
});
