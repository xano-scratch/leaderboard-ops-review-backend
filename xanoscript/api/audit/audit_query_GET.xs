query audit_query verb=GET {
  api_group = "audit"
  auth = "operator"

  input {
    int actor_id?
    int ops_action_id?
    text action?
  }

  stack {
    db.query audit_log {
      join = {
        actor: {
          table: "operator"
          type : "left"
          where: $db.actor_id == $db.actor.id
        }
      }
    
      where = $db.actor_id ==? $input.actor_id && $db.ops_action_id ==? $input.ops_action_id && $db.action ==? $input.action
      sort = {created_at: "desc"}
      eval = {actor_name: $db.actor.name}
      return = {type: "list"}
    } as $rows
  }

  response = $rows
  guid = "52b4e140524c349ee01b499ec4b33fe7"
}