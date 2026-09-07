query entries_list verb=GET {
  api_group = "boards"
  auth = "operator"

  input {
    int leaderboard_id
  }

  stack {
    db.query entry {
      where = $db.leaderboard_id == $input.leaderboard_id
      sort = {rank: "asc"}
      return = {type: "list"}
    } as $rows
  }

  response = $rows
  guid = "2c12f430b3e677e69c51fa2811afe9ed"
}