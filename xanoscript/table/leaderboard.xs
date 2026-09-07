table leaderboard {
  auth = false

  schema {
    int id
    timestamp created_at?=now {
      visibility = "private"
    }
  
    text name
    text game_mode
    int season
    enum status?=active {
      values = ["active", "locked", "archived"]
    }
  
    int entry_count?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]

  guid = "01ee40596bd080dbaf77cd96db8329b9"
}