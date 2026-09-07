query action_execute verb=POST {
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
  
    precondition ($action.status == "approved") {
      error_type = "badrequest"
      error = "Only an approved action can be executed."
    }
  
    db.get operator {
      field_name = "id"
      field_value = $auth.id
      output = ["id", "name", "role"]
    } as $caller
  
    function.run lorb_role_rank {
      input = {role: $caller.role}
    } as $caller_rr
  
    function.run lorb_role_rank {
      input = {role: $action.min_approver_role}
    } as $min_rr
  
    conditional {
      if ($caller_rr.rank < $min_rr.rank) {
        function.run lorb_write_audit {
          input = {
            actor_id     : $auth.id
            action       : "guard.denied"
            ops_action_id: $action.id
            detail_json  : `{ guard: "execute_min_role", required: $var.action.min_approver_role }`
            rule_version : $action.rule_version
          }
        }
      }
    }
  
    precondition ($caller_rr.rank >= $min_rr.rank) {
      error_type = "accessdenied"
      error = "Your role may not execute this action type."
    }
  
    db.query approval {
      where = $db.ops_action_id == $action.id && $db.decision == "approve" && $db.decided_by != $action.requested_by
      return = {type: "count"}
    } as $distinct_approvals
  
    conditional {
      if (($action.sensitive && $distinct_approvals < 1)) {
        function.run lorb_write_audit {
          input = {
            actor_id     : $auth.id
            action       : "guard.denied"
            ops_action_id: $action.id
            detail_json  : `{ guard: "distinct_approver_required" }`
            rule_version : $action.rule_version
          }
        }
      }
    }
  
    precondition ($action.sensitive == false || $distinct_approvals >= 1) {
      error_type = "accessdenied"
      error = "A sensitive action needs an approval from a different operator before it can run."
    }
  
    conditional {
      if ($action.type == "reset_leaderboard") {
        db.bulk.delete entry {
          where = $db.leaderboard_id == $action.leaderboard_id
        } as $reset_deleted
      
        db.edit leaderboard {
          field_name = "id"
          field_value = $action.leaderboard_id
          enforce_hidden_fields = false
          data = {status: "active", entry_count: 0}
        } as $board_reset
      }
    
      elseif ($action.type == "wipe_entry") {
        db.get entry {
          field_name = "id"
          field_value = $action.entry_id
        } as $target_entry
      
        precondition ($target_entry != null) {
          error_type = "badrequest"
          error = "The entry no longer exists."
        }
      
        db.del entry {
          field_name = "id"
          field_value = $action.entry_id
        }
      
        db.query entry {
          where = $db.leaderboard_id == $target_entry.leaderboard_id
          return = {type: "count"}
        } as $remaining
      
        db.edit leaderboard {
          field_name = "id"
          field_value = $target_entry.leaderboard_id
          enforce_hidden_fields = false
          data = {entry_count: $remaining}
        } as $board_wipe
      }
    }
  
    db.edit ops_action {
      field_name = "id"
      field_value = $action.id
      enforce_hidden_fields = false
      data = {status: "executed"}
    } as $executed_action
  
    function.run lorb_write_audit {
      input = {
        actor_id     : $auth.id
        action       : "action.executed"
        ops_action_id: $action.id
        detail_json  : `{ type: $var.action.type, payload: $var.action.payload_json }`
        rule_version : $action.rule_version
      }
    }
  }

  response = $executed_action
  guid = "d5f1071d4eb508fcbb2f9ab65e949cf9"
}