// Append one row to the audit trail.
function lorb_write_audit {
  input {
    int actor_id?
    text action
    int ops_action_id?
    json detail_json?
    text rule_version?
  }

  stack {
    db.add audit_log {
      enforce_hidden_fields = false
      data = {
        created_at   : "now"
        actor_id     : $input.actor_id
        action       : $input.action
        ops_action_id: $input.ops_action_id
        detail_json  : $input.detail_json
        rule_version : $input.rule_version
      }
    } as $row
  }

  response = $row
  guid = "4c82e8ea24373e91580d850c53402012"
}