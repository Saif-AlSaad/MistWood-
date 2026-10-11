extends CharacterBody2D
class_name LionPlayer

## Emitted once the full 16-frame death collapse animation finishes
signal died

## Movement and Physics Constants for Apex Predator Lion
@export_group("Movement")
@export var speed: float = 345.0
@export var acceleration: float = 2100.0
@export var friction: float = 1950.0

@export_group("Jumping")
@export var jump_velocity: float = -610.0
@export var gravity: float = 1470.0
@export var fall_gravity_multiplier: float = 1.35
@export var coyote_time_duration: float = 0.12
@export var jump_buffer_duration: float = 0.12

# Internal Timers and State Flags
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
	# 1. Apply Gravity (Preserved during death so airborne Lion falls onto ground naturally)
	var applied_gravity = gravity
	if velocity.y > 0.0:
		applied_gravity *= fall_gravity_multiplier
		
	if not is_on_floor():
		velocity.y += applied_gravity * delta
		coyote_timer -= delta
	else:
		coyote_timer = coyote_time_duration

	# 2. Handle Death State Execution
	if is_dead:
		# Rapidly decelerate horizontal momentum on fatal impact
		velocity.x = move_toward(velocity.x, 0.0, friction * 2.5 * delta)
		move_and_slide()
		return

	# 3. Jump Buffer & Input Reading
	if Input.is_action_just_pressed("jump") or Input.is_action_just_pressed("ui_accept"):
		jump_buffer_timer = jump_buffer_duration
	else:
		jump_buffer_timer -= delta

	# 4. Execute Explosive Pounce / Jump
	if jump_buffer_timer > 0.0 and coyote_timer > 0.0:
		velocity.y = jump_velocity
		jump_buffer_timer = 0.0
		coyote_timer = 0.0

	# 5. Horizontal Movement & Direction Facing
	var input_axis := 0.0
	if Input.is_action_pressed("move_left") or Input.is_action_pressed("ui_left"):
		input_axis -= 1.0
	if Input.is_action_pressed("move_right") or Input.is_action_pressed("ui_right"):
		input_axis += 1.0

	if input_axis != 0.0:
		velocity.x = move_toward(velocity.x, input_axis * speed, acceleration * delta)
		animated_sprite.flip_h = (input_axis < 0.0)
	else:
		velocity.x = move_toward(velocity.x, 0.0, friction * delta)

	# 6. Godot Physics Simulation
	move_and_slide()

	# 7. Check Slide Collisions with Deadly Objects
	check_deadly_collisions()

	# 8. Update Animation State
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
		return # Strictly ignore repeated collision triggers
		
	is_dead = true
	# Lock animation state to death immediately
	current_anim_state = &"death"
	if animated_sprite != null:
		# Play 16-frame non-looping collapse sequence starting from frame 0
		animated_sprite.play(&"death")

func update_animation() -> void:
	if is_dead:
		return # Death state has absolute priority; movement states cannot override
		
	if not is_on_floor():
		play_animation(&"jump")
		if animated_sprite != null:
			animated_sprite.speed_scale = 1.2
	else:
		if abs(velocity.x) > 10.0:
			play_animation(&"run")
			if animated_sprite != null:
				var run_ratio = clamp(abs(velocity.x) / (speed * 0.75), 1.0, 1.4)
				animated_sprite.speed_scale = run_ratio
		else:
			play_animation(&"idle")
			if animated_sprite != null:
				animated_sprite.speed_scale = 1.0

func play_animation(anim_name: StringName) -> void:
	if is_dead:
		return
	if current_anim_state == anim_name:
		return # Prevent flicker and unnecessary animation frame restarts
		
	current_anim_state = anim_name
	if animated_sprite != null:
		animated_sprite.play(anim_name)

func _on_animation_finished() -> void:
	if animated_sprite != null and animated_sprite.animation == &"death":
		# Maintain the final resting collapse pose (frame 7)
		animated_sprite.stop()
		animated_sprite.set_frame_and_progress(7, 1.0)
		died.emit()
