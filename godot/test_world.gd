extends Node2D

const FOX_SCENE = preload("res://characters/fox/fox.tscn")
const PANDA_SCENE = preload("res://characters/panda/panda.tscn")
const DEER_SCENE = preload("res://characters/deer/deer_player.tscn")
const LION_SCENE = preload("res://characters/lion/lion_player.tscn")

@onready var character_label: Label = $UI/Panel/MarginContainer/HBoxContainer/Label
@onready var switch_button: Button = $UI/Panel/MarginContainer/HBoxContainer/SwitchButton
@onready var game_over_panel: PanelContainer = $UI/GameOverPanel
@onready var game_over_title: Label = $UI/GameOverPanel/MarginContainer/VBoxContainer/Title
@onready var retry_button: Button = $UI/GameOverPanel/MarginContainer/VBoxContainer/HBoxContainer/RetryButton
@onready var change_animal_button: Button = $UI/GameOverPanel/MarginContainer/VBoxContainer/HBoxContainer/ChangeAnimalButton

var current_character: CharacterBody2D = null
var current_type: String = "lion"

func _ready() -> void:
	if game_over_panel != null:
		game_over_panel.visible = false
		
	# Clean up any initial placeholder character in scene
	var initial_fox = get_node_or_null("FoxPlayer")
	if initial_fox != null:
		initial_fox.queue_free()
		
	spawn_character("lion", Vector2(-80, 68))
		
	if switch_button != null:
		switch_button.pressed.connect(_on_switch_pressed)
	if retry_button != null:
		retry_button.pressed.connect(_on_retry_pressed)
	if change_animal_button != null:
		change_animal_button.pressed.connect(_on_switch_pressed)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_R:
			restart_run()
		elif event.keycode == KEY_TAB or event.keycode == KEY_C:
			cycle_character()
		elif event.keycode == KEY_1:
			switch_to_character("fox")
		elif event.keycode == KEY_2:
			switch_to_character("panda")
		elif event.keycode == KEY_3:
			switch_to_character("deer")
		elif event.keycode == KEY_4:
			switch_to_character("lion")

func cycle_character() -> void:
	match current_type:
		"fox":
			switch_to_character("panda")
		"panda":
			switch_to_character("deer")
		"deer":
			switch_to_character("lion")
		"lion":
			switch_to_character("fox")
		_:
			switch_to_character("lion")

func _on_switch_pressed() -> void:
	cycle_character()

func _on_retry_pressed() -> void:
	restart_run()

func restart_run() -> void:
	if game_over_panel != null:
		game_over_panel.visible = false
		
	if current_character != null and is_instance_valid(current_character):
		current_character.queue_free()
		
	spawn_character(current_type, Vector2(-80, 68), Vector2.ZERO, false)

func switch_to_character(type: String) -> void:
	if type == current_type and current_character != null and not current_character.get("is_dead"):
		return
		
	var spawn_pos = Vector2(-80, 68)
	var last_vel = Vector2.ZERO
	var facing_left = false
	
	if current_character != null and is_instance_valid(current_character):
		spawn_pos = current_character.global_position
		last_vel = current_character.velocity
		var sprite = current_character.get_node_or_null("AnimatedSprite2D")
		if sprite:
			facing_left = sprite.flip_h
		current_character.queue_free()
		
	if game_over_panel != null:
		game_over_panel.visible = false
		
	spawn_character(type, spawn_pos, last_vel, facing_left)

func spawn_character(type: String, pos: Vector2, vel: Vector2 = Vector2.ZERO, facing_left: bool = false) -> void:
	current_type = type
	var new_char: CharacterBody2D
	match type:
		"lion":
			new_char = LION_SCENE.instantiate()
			new_char.name = "LionPlayer"
		"deer":
			new_char = DEER_SCENE.instantiate()
			new_char.name = "DeerPlayer"
		"panda":
			new_char = PANDA_SCENE.instantiate()
			new_char.name = "PandaPlayer"
		_:
			new_char = FOX_SCENE.instantiate()
			new_char.name = "FoxPlayer"
		
	new_char.position = pos
	new_char.velocity = vel
	add_child(new_char)
	current_character = new_char
	
	var sprite = new_char.get_node_or_null("AnimatedSprite2D")
	if sprite != null:
		sprite.flip_h = facing_left
		
	# Connect death signal
	if new_char.has_signal("died"):
		new_char.connect("died", _on_character_died)
		
	update_ui()

func _on_character_died() -> void:
	if game_over_panel != null:
		if game_over_title != null:
			match current_type:
				"lion":
					game_over_title.text = "CRASH! Golden Lion Collapsed"
				"deer":
					game_over_title.text = "CRASH! Forest Deer Collapsed"
				"panda":
					game_over_title.text = "CRASH! Mountain Panda Fallen"
				_:
					game_over_title.text = "CRASH! Red Fox Broken Stride"
		game_over_panel.visible = true

func update_ui() -> void:
	if character_label != null:
		match current_type:
			"lion":
				character_label.text = "Active: Golden Lion (Apex Pounce & 16-Frame Death)  |  [Tab / C / 1-4] Switch  |  [R] Retry"
			"deer":
				character_label.text = "Active: Forest Stag Deer (High Agility & Death Collapse)  |  [Tab / C / 1-4] Switch  |  [R] Retry"
			"panda":
				character_label.text = "Active: Mountain Panda (Heavy Momentum)  |  [Tab / C / 1-4] Switch  |  [R] Retry"
			_:
				character_label.text = "Active: Red Fox (Agile Wanderer)  |  [Tab / C / 1-4] Switch  |  [R] Retry"
				
	if switch_button != null:
		match current_type:
			"lion":
				switch_button.text = "Switch to Fox"
			"deer":
				switch_button.text = "Switch to Lion"
			"panda":
				switch_button.text = "Switch to Deer"
			_:
				switch_button.text = "Switch to Panda"

