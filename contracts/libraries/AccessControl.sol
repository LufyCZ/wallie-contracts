// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

abstract contract AccessControl {
  mapping(string => mapping(address => bool)) public roles;

  string constant ADMIN_ROLE = "admin";

  constructor(address _initialOwner) {
    roles["admin"][_initialOwner] = true;
  }

  function hasRole(address _user, string memory _role) public view returns (bool) {
    return roles[_role][_user];
  }

  function 
}