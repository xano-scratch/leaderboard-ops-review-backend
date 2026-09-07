query me verb=GET {
  api_group = "auth"
  auth = "operator"

  input {
  }

  stack {
    db.get operator {
      field_name = "id"
      field_value = $auth.id
      output = ["id", "email", "name", "role", "active"]
    } as $u
  }

  response = {
    id    : $u.id
    name  : $u.name
    role  : $u.role
    email : $u.email
    active: $u.active
  }

  guid = "bfd70d24f92356209c72088852ec320e"
}