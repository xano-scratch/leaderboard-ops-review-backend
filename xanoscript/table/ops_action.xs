table ops_action {
  auth = false

  schema {
    int id
    timestamp created_at?=now {
      visibility = "private"
    }
  
    enum type {
      values = ["reset_leaderboard", "wipe_entry", "grant_reward"]
    }
  
    int leaderboard_id? {
      table = "leaderboard"
    }
  
    int entry_id? {
      table = "entry"
    }
  
    json payload_json?
    int requested_by {
      table = "operator"
    }
  
    enum status?=pending {
      values = ["pending", "approved", "rejected", "executed"]
    }
  
    text reason?
    bool sensitive?
    enum min_approver_role?=lead {
      values = ["ops", "lead", "admin"]
    }
  
    text rule_version?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]

  guid = "08625f8e65c5d0cd2ec30b0cf0f8b530"
}