query "action_detail/{ops_action_id}" verb=GET {
  api_group = "ops"
  auth = "operator"

  input {
    int ops_action_id
  }

  stack {
    db.get ops_action {
      field_name = "id"
      field_value = $input.ops_action_id
    } as $action
  
    precondition ($action != null) {
      error_type = "notfound"
      error = "Action not found."
    }
  
    db.get operator {
      field_name = "id"
      field_value = $action.requested_by
      output = ["id", "name", "role", "email"]
    } as $requester
  
    db.get leaderboard {
      field_name = "id"
      field_value = $action.leaderboard_id
    } as $board
  
    db.get entry {
      field_name = "id"
      field_value = $action.entry_id
    } as $entry_row
  
    db.query approval {
      where = $db.ops_action_id == $action.id
      sort = {created_at: "asc"}
      return = {type: "list"}
    } as $approvals
  }

  response = {
    action   : $action
    requester: $requester
    board    : $board
    entry    : $entry_row
    approvals: $approvals
  }

  guid = "ddf04c4305ef7b1344195c042c791bfb"
}