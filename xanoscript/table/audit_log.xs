table audit_log {
  auth = false

  schema {
    int id
    timestamp created_at?=now {
      visibility = "private"
    }
  
    int actor_id? {
      table = "operator"
    }
  
    text action
    int ops_action_id? {
      table = "ops_action"
    }
  
    json detail_json?
    text rule_version?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]

  guid = "1b71dcef19b2eeb1855a87ace88ef1a0"
}