table approval {
  auth = false

  schema {
    int id
    timestamp created_at?=now {
      visibility = "private"
    }
  
    int ops_action_id {
      table = "ops_action"
    }
  
    int decided_by {
      table = "operator"
    }
  
    enum decision {
      values = ["approve", "reject"]
    }
  
    text note?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]

  guid = "f139daa26901db948305de7008aca3b0"
}