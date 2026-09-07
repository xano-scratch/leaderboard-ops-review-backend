// Derive sensitivity, minimum approver role, and rule version for an action type from the active rule set.
function lorb_resolve_rule {
  input {
    text type
  }

  stack {
    db.query rule_config {
      where = $db.active == true
      return = {type: "single"}
    } as $cfg
  
    precondition ($cfg != null) {
      error = "No active rule set."
    }
  
    var $is_sensitive {
      value = $input.type|in:$cfg.sensitive_types
    }
  
    var $min_role {
      value = "admin"
    }
  
    conditional {
      if ($input.type == "reset_leaderboard") {
        var.update $min_role {
          value = $cfg
            |get:"min_approver_role.reset_leaderboard":"admin"
        }
      }
    
      elseif ($input.type == "wipe_entry") {
        var.update $min_role {
          value = $cfg
            |get:"min_approver_role.wipe_entry":"admin"
        }
      }
    
      elseif ($input.type == "grant_reward") {
        var.update $min_role {
          value = $cfg
            |get:"min_approver_role.grant_reward":"admin"
        }
      }
    }
  }

  response = {
    sensitive: $is_sensitive
    min_role : $min_role
    version  : $cfg.version
  }

  guid = "10d9f41d56cc83572d7a7866bf60deab"
}