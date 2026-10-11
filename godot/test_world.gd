extends Node2D

const FOX_SCENE = preload("res://characters/fox/fox.tscn")
const PANDA_SCENE = preload("res://characters/panda/panda.tscn")

@onready var character_label: Label = $UI/Panel/MarginContainer/HBoxContainer/Label
@onready var switch_button: Button = $UI/Panel/MarginContainer/HBoxContainer/SwitchButton

var current_character: Node2D = null
var current_type: String = "fox"

func _ready() -> void:
	current_character = get_node_or_null("FoxPlayer")
	if current_character == null:
		spawn_character("fox", Vector2(-80, 68))
	else:
		current_type = "fox"
		update_ui()
		
	if switch_button != null:
		switch_button.pressed.connect(_on_switch_pressed)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_TAB or event.keycode == KEY_C:
			toggle_character()
		elif event.keycode == KEY_1:
			switch_to_character("fox")
		elif event.keycode == KEY_2:
			switch_to_character("panda")

func toggle_character() -> void:
	if current_type == "fox":
		switch_to_character("panda")
	else:
		switch_to_character("fox")

func _on_switch_pressed() -> void:
	toggle_character()

func switch_to_character(type: String) -> void:
	if type == current_type and current_character != null:
		return
		
	var spawn_pos = Vector2(-80, 68)
	var last_vel = Vector2.ZERO
	var facing_left = false
	
	if current_character != null and is_instance_valid(current_character):
		spawn_pos = current_character.global_position
		if current_character is CharacterBody2D:
			last_vel = current_character.velocity
		var sprite = current_character.get_node_or_null("AnimatedSprite2D")
		if sprite:
			facing_left = sprite.flip_h
		current_character.queue_free()
		
	spawn_character(type, spawn_pos, last_vel, facing_left)

func spawn_character(type: String, pos: Vector2, vel: Vector2 = Vector2.ZERO, facing_left: bool = false) -> void:
	current_type = type
	var new_char: CharacterBody2D
	if type == "panda":
		new_char = PANDA_SCENE.instantiate()
		new_char.name = "PandaPlayer"
	else:
		new_char = FOX_SCENE.instantiate()
		new_char.name = "FoxPlayer"
		
	new_char.position = pos
	new_char.velocity = vel
	add_child(new_char)
	current_character = new_char
	
	var sprite = new_char.get_node_or_null("AnimatedSprite2D")
	if sprite:
		sprite.flip_h = facing_left
		
	update_ui()

func update_ui() -> void:
	if character_label != null:
		if current_type == "panda":
			character_label.text = "Active: Mountain Panda (Heavy Momentum)  |  Press [Tab] or [C] to Switch"
		else:
			character_label.text = "Active: Red Fox (Agile Wanderer)  |  Press [Tab] or [C] to Switch"
	if switch_button != null:
		if current_type == "panda":
			switch_button.text = "Switch to Fox"
		else:
			switch_button.text = "Switch to Panda"
