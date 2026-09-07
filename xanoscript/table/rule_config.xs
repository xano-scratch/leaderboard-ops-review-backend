table rule_config {
  auth = false

  schema {
    int id
    timestamp created_at?=now {
      visibility = "private"
    }
  
    text version
    json sensitive_types?
    json min_approver_role?
    bool active?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]

  guid = "2a68c2a0f37ba682124f188f71b21171"
}