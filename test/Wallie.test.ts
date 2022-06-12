import {
  Wallie as IWallie,
  Wallie__factory,
  WallieFactory as IWallieFactory,
  WallieFactory__factory,
  ERC20Mock as IERC20Mock,
  ERC20Mock__factory,
} from "../typechain";

import hre, { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { getCurrentTimestamp, getTestAddress, waitUntil } from "./functions";

describe("Wallie", () => {
  let wallieFactory: IWallieFactory;
  let wallie: IWallie;
  let [owner1, owner2, child, random]: SignerWithAddress[] = [];

  before("", async () => {
    const implementation = await (
      (await ethers.getContractFactory("Wallie")) as Wallie__factory
    ).deploy();

    wallieFactory = await (
      (await ethers.getContractFactory(
        "WallieFactory"
      )) as WallieFactory__factory
    ).deploy(implementation.address);

    [owner1, owner2, child, random] = await ethers.getSigners();
  });

  beforeEach("", async () => {
    const deployTx = await wallieFactory.functions.deploy(child.address);
    const events = (await deployTx.wait()).events;
    const instance = events?.find((event) => event.event === "LOG_DEPLOYED")
      ?.args?.[0];

    wallie = (await ethers.getContractAt(
      "Wallie",
      instance!,
      owner1
    )) as IWallie;
  });

  describe("Child address operations", () => {
    it("Is set on init", async () => {
      expect(await wallie.child()).to.equal(child.address);
    });

    it("Can be changed by owner only", async () => {
      let newAddress = getTestAddress(1); // 0x0000..0001
      await expect(wallie.connect(owner1).changeChild(newAddress))
        .to.emit(wallie, "LOG_CHILD_CHANGED")
        .withArgs(newAddress);
      expect(await wallie.child()).to.equal(newAddress);

      let oldAddress = newAddress;
      newAddress = getTestAddress(2);
      await expect(
        wallie.connect(random).changeChild(newAddress)
      ).to.revertedWith("User not owner.");
      expect(await wallie.child()).to.equal(oldAddress);
    });
  });

  describe("Spending", async () => {
    let token: IERC20Mock;

    const secondsPerDay = 86400;

    beforeEach("", async () => {
      token = await (
        (await ethers.getContractFactory("ERC20Mock")) as ERC20Mock__factory
      ).deploy();

      // Set time to 12PM tomorrowfor consistency purposes
      const middleOfToday =
        (await getCurrentTimestamp()) -
        ((await getCurrentTimestamp()) % secondsPerDay) +
        secondsPerDay / 2;
      await waitUntil(middleOfToday + secondsPerDay);
    });

    it("Allows adding / removing limits by owner only", async () => {
      let maxSpend = 0;
      let timeframe = 0;
      let offset = 0;

      await wallie
        .connect(owner1)
        .changeLimit(token.address, maxSpend, timeframe, offset);

      await expect(
        wallie
          .connect(random)
          .changeLimit(token.address, maxSpend, timeframe, offset)
      ).to.be.revertedWith("User not owner.");

      await expect(
        wallie.connect(random).deleteLimit(token.address)
      ).to.be.revertedWith("User not owner.");
    });

    it("Adds / removes a limit", async () => {
      let maxSpend = 20;
      let timeframe = 86400;
      let offset = 5;

      expect(
        await wallie
          .connect(owner1)
          .changeLimit(token.address, maxSpend, timeframe, offset)
      )
        .to.emit(wallie, "LOG_LIMIT_CHANGED")
        .withArgs(token.address, maxSpend, timeframe, offset);

      let limit = await wallie.limits(token.address);
      expect(limit.maxSpend).to.equal(maxSpend);
      expect(limit.timeframe).to.equal(timeframe);
      expect(limit.offset).to.equal(offset);

      maxSpend = 100;
      expect(
        await wallie
          .connect(owner1)
          .changeLimit(token.address, maxSpend, timeframe, offset)
      );

      limit = await wallie.limits(token.address);
      expect(limit.maxSpend).to.equal(maxSpend);
      expect(limit.timeframe).to.equal(timeframe);
      expect(limit.offset).to.equal(offset);

      expect(await wallie.deleteLimit(token.address))
        .to.emit(wallie, "LOG_LIMIT_DELETED")
        .withArgs(token.address);

      limit = await wallie.limits(token.address);
      expect(limit.maxSpend).to.equal(0);
      expect(limit.timeframe).to.equal(0);
      expect(limit.offset).to.equal(0);
    });

    it("Allows the child to spend only the allocated amount", async () => {
      let maxSpend = 1000;
      let timeframe = 86400;
      let offset = 0;

      await wallie
        .connect(owner1)
        .changeLimit(token.address, maxSpend, timeframe, offset);

      await token.mint(wallie.address, BigInt(10e18));

      let amount = 750;

      expect(
        await wallie.connect(child).spend(token.address, random.address, amount)
      )
        .to.emit(wallie, "LOG_SPENT")
        .withArgs(token.address, amount);

      amount = 250; // => 1000
      await wallie.connect(child).spend(token.address, random.address, amount);

      amount = 500; // => >1000
      await expect(
        wallie.connect(child).spend(token.address, random.address, amount)
      ).to.be.revertedWith("SpendingLimit: Spent too much.");
    });

    it("Requires the child to wait for the next timeframe", async () => {
      const secondsPerDay = 86400;

      let maxSpend = 1000;
      let timeframe = secondsPerDay;
      let offset = 0;

      await wallie
        .connect(owner1)
        .changeLimit(token.address, maxSpend, timeframe, offset);

      await token.mint(wallie.address, BigInt(10e18));

      await wallie
        .connect(child)
        .spend(token.address, random.address, maxSpend);

      let startOfToday =
        (await getCurrentTimestamp()) -
        ((await getCurrentTimestamp()) % secondsPerDay);
      await waitUntil(startOfToday + secondsPerDay + 1);

      await wallie
        .connect(child)
        .spend(token.address, random.address, maxSpend);
      await expect(
        wallie.connect(child).spend(token.address, random.address, 1)
      ).to.be.revertedWith("SpendingLimit: Spent too much.");
    });

    it("Works with offsets (+)", async () => {
      const secondsPerDay = 86400;

      let maxSpend = 1000;
      let timeframe = secondsPerDay;
      let offset = 3600;

      await wallie
        .connect(owner1)
        .changeLimit(token.address, maxSpend, timeframe, offset);

      await token.mint(wallie.address, BigInt(10e18));

      await wallie
        .connect(child)
        .spend(token.address, random.address, maxSpend);

      let startOfToday =
        (await getCurrentTimestamp()) -
        ((await getCurrentTimestamp()) % secondsPerDay);
      // 1 hour before reset (23:00)
      await waitUntil(startOfToday + secondsPerDay);

      await expect(
        wallie.connect(child).spend(token.address, random.address, maxSpend)
      ).to.be.revertedWith("SpendingLimit: Spent too much.");

      // 1 hour after reset (1:00)
      await waitUntil(startOfToday + secondsPerDay + offset);

      await wallie
        .connect(child)
        .spend(token.address, random.address, maxSpend);
    });

    it("Works with offsets (-)", async () => {
      const secondsPerDay = 86400;

      let maxSpend = 1000;
      let timeframe = secondsPerDay;
      let offset = -3600;

      await wallie
        .connect(owner1)
        .changeLimit(token.address, maxSpend, timeframe, offset);

      await token.mint(wallie.address, BigInt(10e18));

      await wallie
        .connect(child)
        .spend(token.address, random.address, maxSpend);

      await expect(
        wallie.connect(child).spend(token.address, random.address, maxSpend)
      ).to.be.revertedWith("SpendingLimit: Spent too much.");

      let startOfToday =
        (await getCurrentTimestamp()) -
        ((await getCurrentTimestamp()) % secondsPerDay);

      // 1 hour before reset (23:00)
      await waitUntil(startOfToday + secondsPerDay - secondsPerDay * 2);
      await expect(
        wallie.connect(child).spend(token.address, random.address, maxSpend)
      ).to.be.revertedWith("SpendingLimit: Spent too much.");

      // 1 hour after reset (00:00)
      await waitUntil(startOfToday + secondsPerDay);

      await wallie
        .connect(child)
        .spend(token.address, random.address, maxSpend);
    });
  });

  describe("Custom transactions", () => {
    let token: IERC20Mock;

    beforeEach("", async () => {
      token = await (
        (await ethers.getContractFactory("ERC20Mock")) as ERC20Mock__factory
      ).deploy();
    });

    it("Can only be used by owners && they work", async () => {
      let amount = 10;

      let nonce = await wallie.nonce();
      let value = 0;
      let txData = (
        await token.populateTransaction.mint(owner1.address, amount)
      ).data!;
      let delegateCall = false;

      // Mint 10 tokens to owner1
      expect(
        await wallie
          .connect(owner1)
          .execute(token.address, value, txData, delegateCall, nonce)
      )
        .to.emit(wallie, "LOG_CUSTOM_TRANSACTION")
        .withArgs(token.address, value, txData, delegateCall, nonce);

      expect(await token.balanceOf(owner1.address)).to.equal(amount);

      await expect(
        wallie
          .connect(random)
          .execute(token.address, value, txData, delegateCall, nonce)
      ).to.be.revertedWith("User not owner.");
    });
  });
});
