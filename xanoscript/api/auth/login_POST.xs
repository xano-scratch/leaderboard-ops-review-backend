query login verb=POST {
  api_group = "auth"

  input {
    email email filters=lower|trim
    text password
  }

  stack {
    db.get operator {
      field_name = "email"
      field_value = $input.email
      output = ["id", "email", "name", "role", "active", "password"]
    } as $u
  
    precondition ($u != null) {
      error_type = "unauthorized"
      error = "Invalid email or password."
    }
  
    precondition ($u.active) {
      error_type = "accessdenied"
      error = "This operator account is deactivated."
    }
  
    security.check_password {
      text_password = $input.password
      hash_password = $u.password
    } as $ok
  
    precondition ($ok) {
      error_type = "unauthorized"
      error = "Invalid email or password."
    }
  
    security.create_auth_token {
      table = "operator"
      extras = ""
      expiration = ""
      id = $u.id
    } as $token
  }

  response = {
    token   : $token
    operator: { id: $var.u.id, name: $var.u.name, role: $var.u.role, email: $var.u.email }
  }

  guid = "d39d74f907baeb484e9c93358362998a"
}