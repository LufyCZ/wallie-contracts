// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "./libraries/Child.sol";
import "./libraries/Ownables.sol";
import "./libraries/SpendingLimit.sol";
import "./libraries/Executor.sol";

contract Wallie is Child, Ownables, Initializable, SpendingLimit, Executor {
    uint256 public nonce = 0;

    event LOG_CUSTOM_TRANSACTION(
        address to,
        uint256 value,
        bytes data,
        bool delegateCall,
        uint256 nonce
    );

    // Constructor for proxy contract
    function initialize(address _child, address _owner) external initializer {
        _changeChild(_child);
        _addOwner(_owner);
    }

    // Public child changer
    function changeChild(address _newChild) public onlyOwners {
        _changeChild(_newChild);
    }

    // // Spending limits
    function changeLimit(
        address _token,
        uint256 _maxSpend,
        uint256 _timeframe,
        int256 _offset
    ) public override onlyOwners {
        _changeLimit(_token, _maxSpend, _timeframe, _offset);
    }

    function deleteLimit(address _token) public override onlyOwners {
        _deleteLimit(_token);
    }

    // Spend an amount of tokens under or equal to the defined allowance
    function spend(
        address _token,
        address _to,
        uint256 _amount
    ) public onlyChild {
        _spend(_token, _amount);
        IERC20(_token).transfer(_to, _amount);
    }

    // // Custom transactions
    function execute(
        address payable _to,
        uint256 _value,
        bytes calldata _data,
        bool _delegateCall,
        uint256 _nonce
    ) public onlyOwners {
        require(_nonce == nonce, "Transaction out of order");
        _execute(_to, _value, _data, _delegateCall);
        emit LOG_CUSTOM_TRANSACTION(_to, _value, _data, _delegateCall, nonce);
        nonce = nonce + 1;
    }
}
