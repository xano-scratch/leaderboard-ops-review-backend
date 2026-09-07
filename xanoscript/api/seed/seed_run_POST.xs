query seed_run verb=POST {
  api_group = "seed"

  input {
    bool force?
  }

  stack {
    db.query operator {
      return = {type: "count"}
    } as $op_count
  
    var $did_seed {
      value = false
    }
  
    conditional {
      if ($op_count == 0 || $input.force) {
        db.truncate audit_log {
          reset = true
        }
      
        db.truncate approval {
          reset = true
        }
      
        db.truncate ops_action {
          reset = true
        }
      
        db.truncate entry {
          reset = true
        }
      
        db.truncate leaderboard {
          reset = true
        }
      
        db.truncate operator {
          reset = true
        }
      
        db.truncate rule_config {
          reset = true
        }
      
        db.add rule_config {
          enforce_hidden_fields = false
          data = {
            created_at       : "now"
            version          : "v1"
            sensitive_types  : []
            min_approver_role: {}|set:"reset_leaderboard":"admin"|set:"wipe_entry":"lead"|set:"grant_reward":"lead"
            active           : true
          }
        } as $rc
      
        db.add operator {
          enforce_hidden_fields = false
          data = {
            created_at: "now"
            email     : "priya@studio.games"
            password  : "password123"
            name      : "Priya Rao"
            role      : "ops"
            active    : true
          }
        } as $op_priya
      
        db.add operator {
          enforce_hidden_fields = false
          data = {
            created_at: "now"
            email     : "marco@studio.games"
            password  : "password123"
            name      : "Marco Diaz"
            role      : "lead"
            active    : true
          }
        } as $op_marco
      
        db.add operator {
          enforce_hidden_fields = false
          data = {
            created_at: "now"
            email     : "dana@studio.games"
            password  : "password123"
            name      : "Dana Kim"
            role      : "admin"
            active    : true
          }
        } as $op_dana
      
        db.add leaderboard {
          enforce_hidden_fields = false
          data = {
            created_at : "now"
            name       : "Ranked Ladder"
            game_mode  : "1v1 Duel"
            season     : 7
            status     : "active"
            entry_count: 4
          }
        } as $lb1
      
        db.add leaderboard {
          enforce_hidden_fields = false
          data = {
            created_at : "now"
            name       : "Squad Cup"
            game_mode  : "4v4 Objective"
            season     : 7
            status     : "active"
            entry_count: 3
          }
        } as $lb2
      
        db.add entry {
          enforce_hidden_fields = false
          data = {
            created_at    : "now"
            leaderboard_id: $lb1.id
            player_handle : "xX_Nova_Xx"
            score         : 99999
            rank          : 1
            flagged_cheat : true
          }
        } as $e1
      
        db.add entry {
          enforce_hidden_fields = false
          data = {
            created_at    : "now"
            leaderboard_id: $lb1.id
            player_handle : "Solar"
            score         : 8123
            rank          : 2
            flagged_cheat : false
          }
        } as $e2
      
        db.add entry {
          enforce_hidden_fields = false
          data = {
            created_at    : "now"
            leaderboard_id: $lb1.id
            player_handle : "Rook"
            score         : 7788
            rank          : 3
            flagged_cheat : false
          }
        } as $e3
      
        db.add entry {
          enforce_hidden_fields = false
          data = {
            created_at    : "now"
            leaderboard_id: $lb1.id
            player_handle : "Vext"
            score         : 7020
            rank          : 4
            flagged_cheat : false
          }
        } as $e4
      
        db.add entry {
          enforce_hidden_fields = false
          data = {
            created_at    : "now"
            leaderboard_id: $lb2.id
            player_handle : "Team Aegis"
            score         : 5400
            rank          : 1
            flagged_cheat : false
          }
        } as $e5
      
        db.add entry {
          enforce_hidden_fields = false
          data = {
            created_at    : "now"
            leaderboard_id: $lb2.id
            player_handle : "Team Vanta"
            score         : 5210
            rank          : 2
            flagged_cheat : false
          }
        } as $e6
      
        db.add entry {
          enforce_hidden_fields = false
          data = {
            created_at    : "now"
            leaderboard_id: $lb2.id
            player_handle : "Team Cinder"
            score         : 4990
            rank          : 3
            flagged_cheat : false
          }
        } as $e7
      
        db.add ops_action {
          enforce_hidden_fields = false
          data = {
            created_at       : "now"
            type             : "wipe_entry"
            leaderboard_id   : $lb1.id
            entry_id         : $e1.id
            payload_json     : {}|set:"reason":"suspected aimbot"|set:"evidence":"replay-4821"
            requested_by     : $op_priya.id
            status           : "pending"
            reason           : "Flagged for cheating. Remove from the Ranked Ladder."
            sensitive        : true
            min_approver_role: "lead"
            rule_version     : "v1"
          }
        } as $a1
      
        db.add ops_action {
          enforce_hidden_fields = false
          data = {
            created_at       : "now"
            type             : "reset_leaderboard"
            leaderboard_id   : $lb2.id
            entry_id         : "0"
            payload_json     : {}|set:"scope":"full"|set:"reason":"corrupted season rollover"
            requested_by     : $op_marco.id
            status           : "pending"
            reason           : "Season data corrupted. Reset the board."
            sensitive        : true
            min_approver_role: "admin"
            rule_version     : "v1"
          }
        } as $a2
      
        db.add ops_action {
          enforce_hidden_fields = false
          data = {
            created_at       : "now"
            type             : "grant_reward"
            leaderboard_id   : $lb1.id
            entry_id         : $e2.id
            payload_json     : {}|set:"reward":"Season 7 Finalist badge"|set:"amount":1
            requested_by     : $op_priya.id
            status           : "pending"
            reason           : "Top finish reward for Solar."
            sensitive        : false
            min_approver_role: "lead"
            rule_version     : "v1"
          }
        } as $a3
      
        function.run lorb_write_audit {
          input = {
            actor_id     : $op_priya.id
            action       : "action.requested"
            ops_action_id: $a1.id
            detail_json  : `{ type: "wipe_entry", sensitive: true }`
            rule_version : "v1"
          }
        }
      
        function.run lorb_write_audit {
          input = {
            actor_id     : $op_marco.id
            action       : "action.requested"
            ops_action_id: $a2.id
            detail_json  : `{ type: "reset_leaderboard", sensitive: true }`
            rule_version : "v1"
          }
        }
      
        function.run lorb_write_audit {
          input = {
            actor_id     : $op_priya.id
            action       : "action.requested"
            ops_action_id: $a3.id
            detail_json  : `{ type: "grant_reward", sensitive: false }`
            rule_version : "v1"
          }
        }
      
        function.run lorb_write_audit {
          input = {
            actor_id     : $op_priya.id
            action       : "guard.denied"
            ops_action_id: $a1.id
            detail_json  : `{ guard: "segregation_of_duties", note: "requester tried to approve her own request" }`
            rule_version : "v1"
          }
        }
      
        var.update $did_seed {
          value = true
        }
      }
    }
  }

  response = {
    seeded         : $did_seed
    operators      : 3
    leaderboards   : 2
    entries        : 7
    pending_actions: 3
  }

  guid = "6739b6cf245ec24294010d486882f867"
}