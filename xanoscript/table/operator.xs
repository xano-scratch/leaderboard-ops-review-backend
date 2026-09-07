table operator {
  auth = true

  schema {
    int id
    timestamp created_at?=now {
      visibility = "private"
    }
  
    email email
    password password {
      visibility = "internal"
    }
  
    text name
    enum role {
      values = ["ops", "lead", "admin"]
    }
  
    bool active?=true
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
    {type: "btree|unique", field: [{name: "email"}]}
  ]

  guid = "5079fc60341629761a3a20f0f9780941"
}