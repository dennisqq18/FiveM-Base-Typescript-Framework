class MoneyRepository {
  async record(characterId: number, account: 'cash' | 'card', amount: number, balanceAfter: number, reason: string, actorIdentifier: string): Promise<void> {
    await dbInsert(
      `INSERT INTO rumble_money_transactions
        (character_id, account, amount, balance_after, reason, actor_identifier)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [characterId, account, amount, balanceAfter, reason, actorIdentifier],
    );
  }
}
