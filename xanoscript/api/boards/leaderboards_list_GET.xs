query leaderboards_list verb=GET {
  api_group = "boards"
  auth = "operator"

  input {
  }

  stack {
    db.query leaderboard {
      sort = {season: "desc", name: "asc"}
      return = {type: "list"}
    } as $rows
  }

  response = $rows
  guid = "aac031c14d1e1dcf5d988f3fd9b9232d"
}