# Roast rounds: design (not built yet)

Friends pool SOL into a round, roast each other, vote, and the winning roast's author takes the pool. This needs an Anchor program; the design is below so it can be built and audited next.

- **Round** `["round", creator, round_id]`: creator, entry_lamports, vote_deadline, refund_after, member_count (max 10), top_votes, top_count, status {Open, Settled, Refunding}. Holds the pool.
- **Member** `["member", round, wallet]`: has_voted, refunded.
- **Roast** `["roast", round, author]`: author, target, rule_id, text, votes. One per author per round.
- **RoastedWallet** `["roasted", target]`: roast_count, last_roast, last_roaster. Lets the roasted person see their roast by address.

Instructions: `create_round`, `join_round` (pays entry), `submit_roast` (members only, not self), `vote` (one per member, not own roast, before deadline), `settle` (after deadline, pays the top roast's author; ties split evenly), `refund` (after refund_after if unsettled; each member reclaims their own deposit).

Security notes: checked lamport math, never below rent-exempt, `remaining_accounts` validated in `settle`, settle and refund mutually exclusive, Clock-based deadlines, negative tests for double vote / double refund / self vote. Audit before any deploy. Localnet and devnet only until audited.
