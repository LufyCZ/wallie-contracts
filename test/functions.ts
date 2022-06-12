import hre from "hardhat";

export const getTestAddress = (string: string | number) =>
  "0x" + String(string).padStart(40, "0");
export const getCurrentTimestamp = async () =>
  (await hre.ethers.provider.getBlock("latest")).timestamp;

export async function waitUntil(timestamp: number) {
  const currentTime = (await hre.ethers.provider.getBlock("latest")).timestamp;

  if (currentTime < timestamp) {
    await hre.network.provider.request({
      method: "evm_setNextBlockTimestamp",
      params: [timestamp],
    });
    await hre.network.provider.request({ method: "evm_mine" });
  }
}
