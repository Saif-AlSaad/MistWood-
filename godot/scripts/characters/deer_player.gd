extends CharacterBody2D
class_name DeerPlayer

signal died

## Movement and Physics Constants
@export_group("Movement")
@export var speed: float = 330.0
@export var acceleration: float = 1850.0
@export var friction: float = 1900.0

@export_group("Jumping")
@export var jump_velocity: float = -580.0
@export var gravity: float = 1400.0
@export var fall_gravity_multiplier: float = 1.3
@export var coyote_time_duration: float = 0.12
@export var jump_buffer_duration: float = 0.12

# Internal Timers and State
var coyote_timer: float = 0.0
var jump_buffer_timer: float = 0.0
var current_anim_state: StringName = &""
var is_dead: bool = false

@onready var animated_sprite: AnimatedSprite2D = $AnimatedSprite2D
@onready var collision_shape: CollisionShape2D = $CollisionShape2D
@onready var hazard_detector: Area2D = get_node_or_null("HazardDetector")

func _ready() -> void:
	play_animation(&"idle")
	if animated_sprite != null:
		animated_sprite.animation_finished.connect(_on_animation_finished)
	if hazard_detector != null:
		hazard_detector.body_entered.connect(_on_hazard_entered)
		hazard_detector.area_entered.connect(_on_hazard_entered)

func _physics_process(delta: float) -> void:
	# 1. Apply Gravity (even during death, so airborne deer falls to the ground)
	var applied_gravity = gravity
	if velocity.y > 0.0:
		applied_gravity *= fall_gravity_multiplier
		
	if not is_on_floor():
		velocity.y += applied_gravity * delta
		coyote_timer -= delta
	else:
		coyote_timer = coyote_time_duration

	# 2. Handle Death State
	if is_dead:
		# Rapidly decelerate horizontal momentum on crash
		velocity.x = move_toward(velocity.x, 0.0, friction * 2.0 * delta)
		move_and_slide()
		return

	# 3. Jump Buffer & Input
	if Input.is_action_just_pressed("jump") or Input.is_action_just_pressed("ui_accept"):
		jump_buffer_timer = jump_buffer_duration
	else:
		jump_buffer_timer -= delta

	# 4. Execute Jump
	if jump_buffer_timer > 0.0 and coyote_timer > 0.0:
		velocity.y = jump_velocity
		jump_buffer_timer = 0.0
		coyote_timer = 0.0

	# 5. Horizontal Input & Movement
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

	# 6. Move Character with Godot Physics
	move_and_slide()

	# 7. Check Slide Collisions for Deadly Obstacles
	check_deadly_collisions()

	# 8. Update Animations
	update_animation()

func check_deadly_collisions() -> void:
	if is_dead:
		return
	for i in range(get_slide_collision_count()):
		var col = get_slide_collision(i)
		var collider = col.get_collider()
		if collider != null and collider.is_in_group("deadly_obstacles"):
			die()
			return

func _on_hazard_entered(node: Node) -> void:
	if is_dead:
		return
	if node.is_in_group("deadly_obstacles") or (node.get_parent() != null and node.get_parent().is_in_group("deadly_obstacles")):
		die()

func die() -> void:
	if is_dead:
		return # Prevent restarting if already dead
		
	is_dead = true
	# Interrupt movement states immediately
	current_anim_state = &"death"
	if animated_sprite != null:
		animated_sprite.play(&"death")

func update_animation() -> void:
	if is_dead:
		return # Death animation has highest priority, never override
		
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
	if is_dead:
		return
	if current_anim_state == anim_name:
		return # Prevent flicker and unnecessary restarts
		
	current_anim_state = anim_name
	if animated_sprite != null:
		animated_sprite.play(anim_name)

func _on_animation_finished() -> void:
	if animated_sprite != null and animated_sprite.animation == &"death":
		# Maintain the final resting collapse pose (frame 7)
		animated_sprite.stop()
		animated_sprite.set_frame_and_progress(7, 1.0)
		died.emit()
