extends CharacterBody2D
class_name FoxPlayer

## Movement and Physics Constants
@export_group("Movement")
@export var speed: float = 300.0
@export var acceleration: float = 1800.0
@export var friction: float = 2000.0

@export_group("Jumping")
@export var jump_velocity: float = -550.0
@export var gravity: float = 1400.0
@export var fall_gravity_multiplier: float = 1.3
@export var coyote_time_duration: float = 0.12
@export var jump_buffer_duration: float = 0.12

# Internal Timers and State
var coyote_timer: float = 0.0
var jump_buffer_timer: float = 0.0
var current_anim_state: StringName = &""

@onready var animated_sprite: AnimatedSprite2D = $AnimatedSprite2D
@onready var collision_shape: CollisionShape2D = $CollisionShape2D

func _ready() -> void:
	play_animation(&"idle")

func _physics_process(delta: float) -> void:
	# 1. Apply Gravity
	var applied_gravity = gravity
	if velocity.y > 0.0:
		applied_gravity *= fall_gravity_multiplier
		
	if not is_on_floor():
		velocity.y += applied_gravity * delta
		coyote_timer -= delta
	else:
		coyote_timer = coyote_time_duration

	# 2. Jump Buffer & Input
	if Input.is_action_just_pressed("jump") or Input.is_action_just_pressed("ui_accept"):
		jump_buffer_timer = jump_buffer_duration
	else:
		jump_buffer_timer -= delta

	# 3. Execute Jump
	if jump_buffer_timer > 0.0 and coyote_timer > 0.0:
		velocity.y = jump_velocity
		jump_buffer_timer = 0.0
		coyote_timer = 0.0

	# 4. Horizontal Input & Movement
	var input_axis := 0.0
	if Input.is_action_pressed("move_left") or Input.is_action_pressed("ui_left"):
		input_axis -= 1.0
	if Input.is_action_pressed("move_right") or Input.is_action_pressed("ui_right"):
		input_axis += 1.0

	if input_axis != 0.0:
		velocity.x = move_toward(velocity.x, input_axis * speed, acceleration * delta)
		# Face direction of movement
		animated_sprite.flip_h = (input_axis < 0.0)
	else:
		velocity.x = move_toward(velocity.x, 0.0, friction * delta)

	# 5. Move Character with Godot Physics
	move_and_slide()

	# 6. Update Animations
	update_animation()

func update_animation() -> void:
	if not is_on_floor():
		# Airborne state -> Jump animation
		play_animation(&"jump")
	else:
		# Grounded states
		if abs(velocity.x) > 10.0:
			play_animation(&"run")
		else:
			play_animation(&"idle")

func play_animation(anim_name: StringName) -> void:
	if current_anim_state == anim_name:
		return # Prevent flicker and unnecessary animation restarts
		
	current_anim_state = anim_name
	animated_sprite.play(anim_name)
