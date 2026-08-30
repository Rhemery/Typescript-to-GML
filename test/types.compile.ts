/// <reference path="../types/index.d.ts" />

class obj_type_smoke extends GMObject {
  lives = 3;

  onCreate(): void {
    this.x = 10;
    this.y = 20;
    draw_set_alpha(1);
    show_debug_message(`position=${this.x},${this.y}`);
  }

  onAlarm0(): void {
    this.alarm[0] = 30;
  }

  onKeyPress_32(): void {
    show_debug_message(gm_typeof(gm_self));
  }

  onKeyDown_A(): void {
    show_debug_message("A is down");
  }

  onAsyncNetworking(): void {
    show_debug_message(async_load);
  }

  onCollision_obj_type_target(target: GMInstance<obj_type_target>): void {
    target.health -= 1;
  }

  damageTargets(): void {
    this.gm_with(obj_type_target, (target, caller) => {
      target.health -= 1;
      caller.lives -= 1;
    });
  }
}

class obj_type_target extends GMObject {
  health = 10;
}

class RoomTypeSmoke extends GMRoom {
  onCreate(): void {
    room_goto(RoomTypeSmoke);
  }
}

const instance: GM.Id.Instance = instance_create_layer(0, 0, "Instances", 0);
const authoredAsset: GM.Asset.GMObject = obj_type_target;
const authoredInstance = instance_create_layer(0, 0, "Instances", obj_type_target, { health: 20 });
authoredInstance.health -= 1;
const key: GM.Constant.VirtualKey = vk_space;
const macroValue: number = gm_macro<number>("4", { Debug: "8" });

void instance;
void authoredAsset;
void authoredInstance;
void key;
void macroValue;
void RoomTypeSmoke;
