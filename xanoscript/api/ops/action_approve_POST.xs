query action_approve verb=POST {
  api_group = "ops"
  auth = "operator"

  input {
    int ops_action_id
    enum decision {
      values = ["approve", "reject"]
    }
  
    text note?
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
  
    precondition ($action.status == "pending") {
      error_type = "badrequest"
      error = "This action is no longer pending."
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
            detail_json  : `{ guard: "min_approver_role", required: $var.action.min_approver_role, caller_role: $var.caller.role }`
            rule_version : $action.rule_version
          }
        }
      }
    }
  
    precondition ($caller_rr.rank >= $min_rr.rank) {
      error_type = "accessdenied"
      error = "Your role may not approve this action type."
    }
  
    conditional {
      if ($auth.id == $action.requested_by) {
        function.run lorb_write_audit {
          input = {
            actor_id     : $auth.id
            action       : "guard.denied"
            ops_action_id: $action.id
            detail_json  : `{ guard: "segregation_of_duties", requested_by: $var.action.requested_by }`
            rule_version : $action.rule_version
          }
        }
      }
    }
  
    precondition ($auth.id != $action.requested_by) {
      error_type = "accessdenied"
      error = "You cannot approve your own request. A different operator must review it."
    }
  
    db.add approval {
      enforce_hidden_fields = false
      data = {
        created_at   : "now"
        ops_action_id: $action.id
        decided_by   : $auth.id
        decision     : $input.decision
        note         : $input.note
      }
    } as $approval_row
  
    var $new_status {
      value = "approved"
    }
  
    conditional {
      if ($input.decision == "reject") {
        var.update $new_status {
          value = "rejected"
        }
      }
    }
  
    db.edit ops_action {
      field_name = "id"
      field_value = $action.id
      enforce_hidden_fields = false
      data = {status: $new_status}
    } as $updated
  
    function.run lorb_write_audit {
      input = {
        actor_id     : $auth.id
        action       : "approval.recorded"
        ops_action_id: $action.id
        detail_json  : `{ decision: $input.decision, new_status: $var.new_status }`
        rule_version : $action.rule_version
      }
    }
  }

  response = {action: $updated, approval: $approval_row}
  guid = "d7783bf4a61c81fe85ab7560d4746b29"
}