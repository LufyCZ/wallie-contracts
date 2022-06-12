// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

abstract contract Child {
    address public child;

    event LOG_CHILD_CHANGED(address newChild);

    modifier onlyChild() {
        require(child == msg.sender, "User not child.");
        _;
    }

    function _changeChild(address _newChild) internal {
        child = _newChild;
        emit LOG_CHILD_CHANGED(_newChild);
    }
}
