// Map an operator role to its numeric rank (ops=1, lead=2, admin=3).
function lorb_role_rank {
  input {
    text role
  }

  stack {
    var $rank {
      value = 0
    }
  
    conditional {
      if ($input.role == "admin") {
        var.update $rank {
          value = 3
        }
      }
    
      elseif ($input.role == "lead") {
        var.update $rank {
          value = 2
        }
      }
    
      elseif ($input.role == "ops") {
        var.update $rank {
          value = 1
        }
      }
    }
  }

  response = {rank: $rank}
  guid = "394a6cb65ed4365b4124f0647ecf8eec"
}