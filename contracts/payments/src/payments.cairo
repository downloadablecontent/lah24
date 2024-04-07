use starknet::{ get_contract_address, get_caller_address, get_block_timestamp, ContractAddress, get_block_number };

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

struct DirectPayment {
  amount: u256,
  payable_after: u64,
}

#[starknet::interface]
trait IPaymentContract<TContractState> {
  fn get_direct_payments(self: @TContractState) -> DirectPayment;
  fn propose_direct_payment(ref self: TContractState, recepient: ContractAddress, amount: u256, payable_after: u64);
  fn claim_direct_payment(ref self: TContractState, sender: ContractAddress);
  fn cancel_direct_payment(ref self: ContractState, recepient: ContractAddress);
}

#[starknet::contract]
mod PaymentContract {
  //sepholia eth
  const ERC20_CONTRACT: ContractAddress = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

  use super::IERC20DispatcherTrait;
  use super::IERC20Dispatcher;

  #[storage]
  struct Storage {
    direct_payments: LegacyMap::<(ContractAddress, ContractAddress), DirectPayment>,
  }

  #[abi(embed_v0)]
  impl PaymentContract of super::IPaymentContract<ContractState> {
    #[view]
    fn get_direct_payments(self: ContractState, sender: ContractAddress, recepient: ContractAddress) -> DirectPayment {
      direct_payments::read((sender, recepient))
    }

    //ref means mutable here
    #[external]
    fn propose_direct_payment(ref self: ContractState, recepient: ContractAddress, amount: u256, payable_after: u64) {
      let sender: ContractAddress = get_caller_address();
      let payment_info = self::read((sender, recepient));
      assert(payment_info.amount != 0_u256, "CANCEL_OR_CLAIM_EXISTING_PAYMENT_FIRST");
      //check allowance
      assert(IERC20Dispatcher { ERC20_CONTRACT }.allowance(sender, get_contract_address()) >= amount, "ALLOWANCE_NOT_ENOUGH");
      //take coins
      IERC20Dispatcher { ERC20_CONTRACT }.transfer_from(sender, get_contract_address(), amount);
      self.stored_data.write((sender, recepient), DirectPayment {
        amount,
        payable_after,
      });
    }

    #[external]
    fn claim_direct_payment(ref self: ContractState, sender: ContractAddress) {
      let recepient: ContractAddress = get_caller_address();
      let payment_info = self::read((sender, recepient));
      assert(payment_info.amount != 0_u256, "NO_PAYMENT_TO_CLAIM");
      //check it is after time
      assert(get_block_timestamp() > payment_info.payable_after);
      //should this be after the send?
      self.stored_data.write((sender, recepient), DirectPayment {
        amount: 0,
        payable_after: 0,
      });
      //send coins
      IERC20Dispatcher { ERC20_CONTRACT }.transfer(recepient, payment_info.amount);
    }

    #[external]
    fn cancel_direct_payment(ref self: ContractState, recepient: ContractAddress) {
      let sender: ContractAddress = get_caller_address();
      let payment_info = self::read((sender, recepient));
      assert(payment_info.amount != 0_u256, "NO_PAYMENT_TO_CANCEL");
      //should this be after the refund?
      self.stored_data.write((sender, recepient), DirectPayment {
        amount: 0,
        payable_after: 0,
      });
      //return coins
      IERC20Dispatcher { ERC20_CONTRACT }.transfer(sender, payment_info.amount);
    }
  }
}
