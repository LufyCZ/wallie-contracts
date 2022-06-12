// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Executor {
    function _execute(
        address to,
        uint256 value,
        bytes memory data,
        bool delegateCall
    ) internal returns (bool success) {
        if (delegateCall) {
            // solhint-disable-next-line no-inline-assembly
            assembly {
                success := delegatecall(
                    gas(),
                    to,
                    add(data, 0x20),
                    mload(data),
                    0,
                    0
                )
            }
        } else {
            // solhint-disable-next-line no-inline-assembly
            assembly {
                success := call(
                    gas(),
                    to,
                    value,
                    add(data, 0x20),
                    mload(data),
                    0,
                    0
                )
            }
        }
    }
}
