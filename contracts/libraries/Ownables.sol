// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

abstract contract Ownables {
    mapping(address => bool) public owners;

    event LOG_OWNER_ADDED(address user);
    event LOG_OWNER_REMOVED(address user);

    modifier onlyOwners() {
        require(owners[msg.sender], "User not owner.");
        _;
    }

    function _addOwner(address _user) internal {
        owners[_user] = true;
        emit LOG_OWNER_ADDED(_user);
    }

    function addOwner(address _user) public onlyOwners {
        _addOwner(_user);
    }

    function _removeOwner(address _user) internal {
        owners[_user] = false;
        emit LOG_OWNER_REMOVED(_user);
    }

    function removeOwner(address _user) public onlyOwners {
        _removeOwner(_user);
    }
}
