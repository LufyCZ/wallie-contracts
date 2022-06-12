// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/Clones.sol";

interface IWallie {
    function initialize(address _child, address _owner) external;
}

contract WallieFactory {
    address public immutable implementation;

    event LOG_DEPLOYED(address instance);

    constructor(address _implementation) {
        implementation = _implementation;
    }

    function deploy(address _child) public {
        address instance = Clones.clone(implementation);
        IWallie(instance).initialize(_child, msg.sender);

        emit LOG_DEPLOYED(instance);
    }
}
