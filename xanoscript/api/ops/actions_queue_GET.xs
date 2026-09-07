query actions_queue verb=GET {
  api_group = "ops"
  auth = "operator"

  input {
    text status?
  }

  stack {
    db.query ops_action {
      join = {
        req: {
          table: "operator"
          type : "left"
          where: $db.requested_by == $db.req.id
        }
        lb : {
          table: "leaderboard"
          type : "left"
          where: $db.leaderboard_id == $db.lb.id
        }
        ent: {
          table: "entry"
          type : "left"
          where: $db.entry_id == $db.ent.id
        }
      }
    
      where = $db.status ==? $input.status
      sort = {created_at: "desc"}
      eval = {
        requester_name: $db.req.name
        requester_role: $db.req.role
        board_name    : $db.lb.name
        entry_handle  : $db.ent.player_handle
      }
    
      return = {type: "list"}
    } as $rows
  }

  response = $rows
  guid = "ab534438559ff8bbfad36dc6c0712ac5"
}