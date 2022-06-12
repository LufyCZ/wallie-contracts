// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "hardhat/console.sol";

abstract contract SpendingLimit {
    struct LastLimit {
        uint256 timeframeStart;
        uint256 amountSpent;
    }

    struct Limit {
        uint256 maxSpend; // How much can be spent in the specific timeframe
        uint256 timeframe; // How often the limit should reset (86400 = 1/day)
        int256 offset; // +- time offset for timezone reasons
        LastLimit lastLimit; // Used for tracking spends
    }

    event LOG_SPENT(address token, uint256 amount);
    event LOG_LIMIT_CHANGED(
        address token,
        uint256 maxSpend,
        uint256 timeframe,
        int256 offset
    );
    event LOG_LIMIT_DELETED(address token);

    // Token address => Amount + timeframe
    mapping(address => Limit) public limits;

    // For both adding and changing token spend limits
    function _changeLimit(
        address _token,
        uint256 _maxSpend,
        uint256 _timeframe,
        int256 _offset
    ) internal {
        limits[_token] = Limit(_maxSpend, _timeframe, _offset, LastLimit(0, 0));
        emit LOG_LIMIT_CHANGED(_token, _maxSpend, _timeframe, _offset);
    }

    function changeLimit(
        address _token,
        uint256 _maxSpend,
        uint256 _timeframe,
        int256 _offset
    ) public virtual {}

    // Fully deletes a limit
    function _deleteLimit(address _token) internal {
        delete limits[_token];
        emit LOG_LIMIT_DELETED(_token);
    }

    function deleteLimit(address _token) public virtual {}

    // Subtracts the amount from the max amount spent in the current timeframe, reverts if it's too much
    function _spend(address _token, uint256 _amount) internal {
        Limit memory limit = limits[_token];

        if (isInThisTimeframe(limit)) {
            require(
                limit.lastLimit.amountSpent + _amount <= limit.maxSpend,
                "SpendingLimit: Spent too much."
            );
            limit.lastLimit.amountSpent += _amount;
        } else {
            require(
                _amount <= limit.maxSpend,
                "SpendingLimit: Spent too much."
            );
            limit.lastLimit = LastLimit(block.timestamp, _amount);
        }

        emit LOG_SPENT(_token, _amount);

        limits[_token] = limit;
    }

    // Checks if we're still in the last timeframe
    // Supports offsets for timezone reasons (we want to reset f.e. at 12AM)
    function isInThisTimeframe(Limit memory _limit) public view returns (bool) {
        if (_limit.lastLimit.timeframeStart == 0) {
            return false;
        }

        uint256 currentReset;

        if (_limit.offset > 0) {
            uint256 offset = uint256(_limit.offset);
            currentReset =
                block.timestamp -
                ((block.timestamp - offset) % _limit.timeframe);
        } else if (_limit.offset < 0) {
            uint256 offset = uint256(-1 * _limit.offset);

            currentReset =
                block.timestamp -
                ((block.timestamp + offset) % _limit.timeframe);
        } else {
            currentReset =
                block.timestamp -
                (block.timestamp % _limit.timeframe);
        }

        return (_limit.lastLimit.timeframeStart > currentReset);
    }
}
