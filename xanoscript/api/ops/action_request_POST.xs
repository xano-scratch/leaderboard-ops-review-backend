query action_request verb=POST {
  api_group = "ops"
  auth = "operator"

  input {
    enum type {
      values = ["reset_leaderboard", "wipe_entry", "grant_reward"]
    }
  
    int leaderboard_id?
    int entry_id?
    json payload_json?
    text reason?
  }

  stack {
    db.get leaderboard {
      field_name = "id"
      field_value = $input.leaderboard_id
    } as $lb
  
    db.get entry {
      field_name = "id"
      field_value = $input.entry_id
    } as $ent
  
    conditional {
      if ($input.type == "reset_leaderboard") {
        precondition ($lb != null) {
          error_type = "badrequest"
          error = "Leaderboard not found."
        }
      }
    
      elseif ($input.type == "wipe_entry") {
        precondition ($ent != null) {
          error_type = "badrequest"
          error = "Entry not found."
        }
      }
    
      elseif ($input.type == "grant_reward") {
        precondition ($ent != null) {
          error_type = "badrequest"
          error = "Entry not found for the reward."
        }
      }
    }
  
    function.run lorb_resolve_rule {
      input = {type: $input.type}
    } as $rule
  
    db.add ops_action {
      enforce_hidden_fields = false
      data = {
        created_at       : "now"
        type             : $input.type
        leaderboard_id   : $input.leaderboard_id
        entry_id         : $input.entry_id
        payload_json     : $input.payload_json
        requested_by     : $auth.id
        status           : "pending"
        reason           : $input.reason
        sensitive        : $rule.sensitive
        min_approver_role: $rule.min_role
        rule_version     : $rule.version
      }
    } as $action
  
    function.run lorb_write_audit {
      input = {
        actor_id     : $auth.id
        action       : "action.requested"
        ops_action_id: $action.id
        detail_json  : `{ type: $input.type, sensitive: $var.rule.sensitive, min_approver_role: $var.rule.min_role }`
        rule_version : $rule.version
      }
    }
  }

  response = $action
  guid = "387dfd5165cd90f9cfbadce636ef2d2c"
}