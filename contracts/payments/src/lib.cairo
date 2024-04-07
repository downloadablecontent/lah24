use starknet::ContractAddress;

#[starknet::interface]
trait IERC20<TContractState> {
  fn name(self: @TContractState) -> felt252;

  fn symbol(self: @TContractState) -> felt252;

  fn decimals(self: @TContractState) -> u8;

  fn total_supply(self: @TContractState) -> u256;

  fn balance_of(self: @TContractState, account: ContractAddress) -> u256;

  fn allowance(self: @TContractState, owner: ContractAddress, spender: ContractAddress) -> u256;

  fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;

  fn transfer_from(
    ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256
  ) -> bool;

  fn approve(ref self: TContractState, spender: ContractAddress, amount: u256) -> bool;
}

#[derive(Drop, Serde, starknet::Store)]
struct DirectPayment {
  amount: u256,
  payable_after: u64,
}

#[starknet::interface]
trait IPaymentContract<TContractState> {
  fn constructor(ref self: TContractState, erc20_contract: ContractAddress);
  fn get_direct_payments(self: @TContractState, sender: ContractAddress, recepient: ContractAddress) -> DirectPayment;
  fn propose_direct_payment(ref self: TContractState, recepient: ContractAddress, amount: u256, payable_after: u64);
  fn claim_direct_payment(ref self: TContractState, sender: ContractAddress);
  fn cancel_direct_payment(ref self: TContractState, recepient: ContractAddress);
}

#[starknet::contract]
mod PaymentContract {
  //sepholia eth
  //0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7

  use super::{ IERC20Dispatcher, IERC20DispatcherTrait, DirectPayment };

  use starknet::{ get_contract_address, get_caller_address, get_block_timestamp, ContractAddress, get_block_number };

  #[storage]
  struct Storage {
    erc20_contract: ContractAddress,
    direct_payments: LegacyMap::<(ContractAddress, ContractAddress), DirectPayment>,
  }

  impl PaymentContract of super::IPaymentContract<ContractState> {
    #[constructor]
    fn constructor(ref self: ContractState, erc20_contract: ContractAddress) {
      self.erc20_contract.write(erc20_contract);
    }

    //#[view]
    #[external(v0)]
    fn get_direct_payments(self: @ContractState, sender: ContractAddress, recepient: ContractAddress) -> DirectPayment {
      self.direct_payments.read((sender, recepient))
    }

    //ref means mutable here
    //#[external]
    #[external(v0)]
    fn propose_direct_payment(ref self: ContractState, recepient: ContractAddress, amount: u256, payable_after: u64) {
      let sender: ContractAddress = get_caller_address();
      let payment_info = self.direct_payments.read((sender, recepient));
      assert(payment_info.amount != 0_u256, 'CANCEL_OR_CLAIM_EXISTING_FIRST');
      //check allowance
      assert(IERC20Dispatcher { contract_address: self.erc20_contract.read() }.allowance(sender, get_contract_address()) >= amount, 'ALLOWANCE_NOT_ENOUGH');
      //take coins
      IERC20Dispatcher { contract_address: self.erc20_contract.read() }.transfer_from(sender, get_contract_address(), amount);
      self.direct_payments.write((sender, recepient), DirectPayment {
        amount,
        payable_after,
      });
    }

    //#[external]
    #[external(v0)]
    fn claim_direct_payment(ref self: ContractState, sender: ContractAddress) {
      let recepient: ContractAddress = get_caller_address();
      let payment_info = self.direct_payments.read((sender, recepient));
      assert(payment_info.amount != 0_u256, 'NO_PAYMENT_TO_CLAIM');
      //check it is after time
      assert(get_block_timestamp() > payment_info.payable_after, 'WAIT_LATER');
      //should this be after the send?
      self.direct_payments.write((sender, recepient), DirectPayment {
        amount: 0,
        payable_after: 0,
      });
      //send coins
      IERC20Dispatcher { contract_address: self.erc20_contract.read() }.transfer(recepient, payment_info.amount);
    }

    //#[external]
    #[external(v0)]
    fn cancel_direct_payment(ref self: ContractState, recepient: ContractAddress) {
      let sender: ContractAddress = get_caller_address();
      let payment_info = self.direct_payments.read((sender, recepient));
      assert(payment_info.amount != 0_u256, 'NO_PAYMENT_TO_CANCEL');
      //should this be after the refund?
      self.direct_payments.write((sender, recepient), DirectPayment {
        amount: 0,
        payable_after: 0,
      });
      //return coins
      IERC20Dispatcher { contract_address: self.erc20_contract.read() }.transfer(sender, payment_info.amount);
    }
  }
}
