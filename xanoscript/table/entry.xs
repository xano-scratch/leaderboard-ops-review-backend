table entry {
  auth = false

  schema {
    int id
    timestamp created_at?=now {
      visibility = "private"
    }
  
    int leaderboard_id {
      table = "leaderboard"
    }
  
    text player_handle
    int score?
    int rank?
    bool flagged_cheat?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]

  guid = "172343a2f694c045dd0b26f7db0c7b75"
}