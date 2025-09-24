$(document).ready(function() {
		let currentBracket = [];
		let bracketData = [];
		let totalRounds = 0;
		let currentRound = 1;
		let collapsedRounds = 0; // Track collapsed rounds separately
		
		// Function to update movie count display
		function updateMovieCount() {
			const movieText = $('#movie-list').val().trim();
			const movies = movieText ? parseMovieList(movieText) : [];
			$('#movie-count').text(`Movies: ${movies.length}`);
		}
		
		// Update movie count on input
		$('#movie-list').on('input', updateMovieCount);
	
	// Function to get next power of 2
	function getNextPowerOfTwo(n) {
		if (n <= 2) return 2;
		if (n <= 4) return 4;
		if (n <= 8) return 8;
		if (n <= 16) return 16;
		if (n <= 32) return 32;
		if (n <= 64) return 64;
		return 64; // Max supported
	}

	// Function to parse movie list
	function parseMovieList(text) {
		return text.split('\n')
			.map(line => line.trim())
			.filter(line => line.length > 0);
	}

	// Function to shuffle array
	function shuffle(array) {
		const shuffled = [...array];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return shuffled;
	}

	// Function to create bracket structure
	function createBracketStructure(movies) {
		const bracketSize = getNextPowerOfTwo(movies.length);
		const rounds = Math.log2(bracketSize);
		totalRounds = rounds;
		
		const numByes = bracketSize - movies.length;
		
		if (numByes === 0) {
			// No BYEs needed
			var paddedMovies = [...movies];
		} else {
			// Hardcoded BYE positions for standard tournament seeding
			const byePositionsMap = {
				4: [4, 2],
				8: [8, 4, 7, 3],
				16: [16, 8, 15, 7, 12, 4, 11, 3],
				32: [32, 16, 31, 15, 24, 8, 23, 7, 28, 12, 27, 11, 20, 4, 19, 3],
				64: [64, 32, 63, 31, 48, 16, 47, 15, 56, 24, 55, 23, 40, 8, 39, 7, 
					 44, 28, 43, 27, 36, 12, 35, 11, 52, 20, 51, 19, 60, 4, 59, 3]
			};
			
			const byePositions = byePositionsMap[bracketSize] || [];
			const actualByePositions = byePositions.slice(0, numByes);
			
			// Create array with movies and BYEs in correct positions
			const result = Array(bracketSize);
			let movieIndex = 0;
			
			for (let pos = 1; pos <= bracketSize; pos++) {
				if (actualByePositions.includes(pos)) {
					result[pos - 1] = 'BYE';
				} else {
					result[pos - 1] = movies[movieIndex];
					movieIndex++;
				}
			}
			
			var paddedMovies = result;
		}

		// Create bracket structure
		const bracket = [];
		let currentRoundMatches = bracketSize / 2;
		let matchId = 1;

		for (let round = 1; round <= rounds; round++) {
			bracket[round] = [];
			for (let match = 0; match < currentRoundMatches; match++) {
				if (round === 1) {
					// First round - populate with properly arranged teams
					bracket[round].push({
						id: matchId++,
						round: round,
						team1: paddedMovies[match * 2],
						team2: paddedMovies[match * 2 + 1],
						winner: '',
						team1Votes: 0,
						team2Votes: 0
					});
				} else {
					// Later rounds - empty for now
					bracket[round].push({
						id: matchId++,
						round: round,
						team1: '',
						team2: '',
						winner: '',
						team1Votes: 0,
						team2Votes: 0
					});
				}
			}
			currentRoundMatches /= 2;
		}

		return bracket;
	}

	// Helper function to update winner classes without flashing
	function updateWinnerHighlight(teamDiv, shouldHighlight) {
		const hasWinnerClass = teamDiv.hasClass('winner');
		if (shouldHighlight && !hasWinnerClass) {
			teamDiv.addClass('winner');
		} else if (!shouldHighlight && hasWinnerClass) {
			teamDiv.removeClass('winner');
		}
	}

	// Function to render bracket
	function renderBracket(skipByes = false) {
		const container = $('#bracket-container');

		if (bracketData.length === 0) {
			container.empty();
			return;
		}

		// Store existing match positions before any changes
		const existingPositions = {};
		container.find('.match').each(function() {
			const matchId = $(this).data('match-id');
			const rect = this.getBoundingClientRect();
			const containerRect = container[0].getBoundingClientRect();
			existingPositions[matchId] = {
				top: rect.top - containerRect.top + container.scrollTop(),
				left: rect.left - containerRect.left + container.scrollLeft()
			};
		});

		// Calculate spacing for tree structure - much more generous spacing
		const firstRoundMatches = bracketData[1].length;
		const actualMatchHeight = 187; // Height of match div
		const finalSpacing = actualMatchHeight + 13; // Extra spacing for clarity

		// Calculate the total height needed for the bracket with proper spacing
		const totalContainerHeight = firstRoundMatches * finalSpacing;

		// Keep track of which rounds and matches already exist
		const existingRounds = new Set();
		const existingMatches = new Set();
		
		container.find('.round').each(function() {
			existingRounds.add(parseInt($(this).data('round')));
		});
		
		container.find('.match').each(function() {
			existingMatches.add(parseInt($(this).data('match-id')));
		});

		for (let round = 1; round <= totalRounds; round++) {
			// Skip collapsed rounds entirely - remove their divs
			if (round <= collapsedRounds) {
				container.find(`.round-${round}`).remove();
				continue;
			}
			
			let roundDiv = container.find(`.round-${round}`);
			
			// Create round if it doesn't exist
			if (roundDiv.length === 0) {
				roundDiv = $(`<div class="round round-${round}" data-round="${round}"></div>`);
				const roundTitle = $(`<h3>Round ${round}${round === totalRounds ? ' - FINAL' : ''}</h3>`);
				roundDiv.append(roundTitle);
				
				// Insert rounds in the correct order (leftmost first)
				let inserted = false;
				container.find('.round').each(function() {
					const existingRound = parseInt($(this).data('round'));
					if (existingRound > round) {
						roundDiv.insertBefore($(this));
						inserted = true;
						return false; // Break the loop
					}
				});
				
				if (!inserted) {
					container.append(roundDiv);
				}
			}

			const matchesInRound = bracketData[round].length;
			
			// Calculate positions mathematically - no dynamic repositioning
			const spacingMultiplier = Math.pow(2, (round - collapsedRounds) - 1); // Adjust for collapsed rounds
			const matchSpacing = finalSpacing * spacingMultiplier;
			
			// Calculate start offset for proper centering
			const roundHeight = matchesInRound * matchSpacing;
			const startOffset = matchSpacing / 2;

			bracketData[round].forEach((match, index) => {
				// Only highlight actual movies that won their match (not BYEs)
				const team1IsBye = match.team1 === 'BYE';
				const team2IsBye = match.team2 === 'BYE';
				const shouldHighlightTeam1 = match.winner && match.winner === match.team1 && !team1IsBye;
				const shouldHighlightTeam2 = match.winner && match.winner === match.team2 && !team2IsBye;
				
				// Calculate final position mathematically - no changes after this
				const topPosition = startOffset + (index * matchSpacing);
				
				// Check if match already exists
				let matchDiv = roundDiv.find(`[data-match-id="${match.id}"]`);
				
				if (matchDiv.length === 0) {
					// Create new match
					matchDiv = $(`
						<div class="match" data-match-id="${match.id}" style="top: ${topPosition}px;">
							<div class="team-container">
								<div class="team team1 ${shouldHighlightTeam1 ? 'winner' : ''}">
									<input type="text" class="team-input" value="${match.team1}" data-team="1">
									<button class="vote-btn" data-team="1" ${match.team1 === 'BYE' || match.winner ? 'disabled' : ''}>
										✓
									</button>
								</div>
								<div class="vs">
									VS
									${match.winner && !team1IsBye && !team2IsBye ? `<button class="undo-btn" title="Undo match result">✕</button>` : ''}
								</div>
								<div class="team team2 ${shouldHighlightTeam2 ? 'winner' : ''}">
									<input type="text" class="team-input" value="${match.team2}" data-team="2">
									<button class="vote-btn" data-team="2" ${match.team2 === 'BYE' || match.winner ? 'disabled' : ''}>
										✓
									</button>
								</div>
							</div>
						</div>
					`);
					
					// If this match had a previous position, start from there for smooth transition
					if (existingPositions[match.id]) {
						matchDiv.css({
							top: existingPositions[match.id].top + 'px',
							left: existingPositions[match.id].left + 'px'
						});
						// Animate to final position
						matchDiv.animate({ top: topPosition + 'px' }, 300);
					}
					
					roundDiv.append(matchDiv);
				} else {
					// Update existing match content
					const team1Div = matchDiv.find('.team1');
					const team2Div = matchDiv.find('.team2');
					const vsDiv = matchDiv.find('.vs');
					
					// Update team classes more precisely to avoid flashing
					updateWinnerHighlight(team1Div, shouldHighlightTeam1);
					updateWinnerHighlight(team2Div, shouldHighlightTeam2);
					
					// Update team inputs
					team1Div.find('.team-input').val(match.team1);
					team2Div.find('.team-input').val(match.team2);
					
					// Update vote button states
					team1Div.find('.vote-btn').prop('disabled', match.team1 === 'BYE' || match.winner);
					team2Div.find('.vote-btn').prop('disabled', match.team2 === 'BYE' || match.winner);
					
					// Update undo button
					const shouldShowUndo = match.winner && !team1IsBye && !team2IsBye;
					const existingUndo = vsDiv.find('.undo-btn');
					
					if (shouldShowUndo && existingUndo.length === 0) {
						vsDiv.append(`<button class="undo-btn" title="Undo match result">✕</button>`);
					} else if (!shouldShowUndo && existingUndo.length > 0) {
						existingUndo.remove();
					}
					
					// Ensure match is in correct position (no animation for updates)
					matchDiv.css('top', topPosition + 'px');
				}
			});
		}

		// Remove any rounds that no longer exist
		container.find('.round').each(function() {
			const roundNum = parseInt($(this).data('round'));
			if (roundNum > totalRounds) {
				$(this).remove();
			}
		});

		// Set container height to ensure it fits all content without scrollbars
		container.css('height', totalContainerHeight + 'px');

		// Handle BYE advancement automatically when needed
		if (!skipByes) {
			// Only process BYEs if not currently processing other operations
			if (!isProcessingBracket) {
				handleByes();
			}
		}
	}

	// Function to add static connector lines based on calculated positions
	function addStaticConnectorLines() {
		// Remove existing connector lines
		$('.connector-horizontal, .connector-vertical, .connector-final').remove();

		// Use the same spacing calculation as renderBracket
		const actualMatchHeight = 187;
		const finalSpacing = actualMatchHeight + 13; // Same as renderBracket

		for (let round = 1; round < totalRounds; round++) {
			// Skip collapsed rounds
			if (round < collapsedRounds) {
				continue;
			}
			
			const currentRoundMatches = bracketData[round].length;
			
			// Calculate spacing for current round: same as renderBracket
			const spacingMultiplier = Math.pow(2, (round - collapsedRounds) - 1); // Adjust for collapsed rounds
			const matchSpacing = finalSpacing * spacingMultiplier;
			
			// Calculate start offset: same as renderBracket
			const startOffset = matchSpacing / 2 + 64; // padding on titlw

			for (let matchIndex = 0; matchIndex < currentRoundMatches; matchIndex++) {
				const matchTopPosition = startOffset + (matchIndex * matchSpacing);
				const matchCenterY = matchTopPosition + 93.5; // Center of 187px tall match (including padding)
				const matchRightX = (round - 1 - collapsedRounds) * (300 + 100) + 260 + 32; // Adjust for collapsed rounds

				// Horizontal line from match to connector junction
				const horizontalConnector = $(`
					<div class="connector-horizontal" style="
						position: absolute;
						top: ${matchCenterY - 1}px;
						left: ${matchRightX}px;
						width: 70px;
						height: 2px;
						background: #30363d;
						z-index: 5;
					"></div>
				`);
				$('#bracket-container').append(horizontalConnector);
				
				// Vertical line connecting pairs to next round (only for even indices)
				if (matchIndex % 2 === 0 && matchIndex + 1 < currentRoundMatches) {
					const nextMatchTopPosition = startOffset + ((matchIndex + 1) * matchSpacing);
					const nextMatchCenterY = nextMatchTopPosition + 93.5;
					
					const verticalStart = Math.min(matchCenterY, nextMatchCenterY);
					const verticalEnd = Math.max(matchCenterY, nextMatchCenterY);
					const connectorX = matchRightX + 70;
					
					const verticalConnector = $(`
						<div class="connector-vertical" style="
							position: absolute;
							top: ${verticalStart - 1}px;
							left: ${connectorX}px;
							width: 2px;
							height: ${verticalEnd - verticalStart + 2}px;
							background: #30363d;
							z-index: 5;
						"></div>
					`);
					$('#bracket-container').append(verticalConnector);
					
					// Horizontal line to next round
					const midY = (verticalStart + verticalEnd) / 2;
					const finalConnector = $(`
						<div class="connector-final" style="
							position: absolute;
							top: ${midY - 1}px;
							left: ${connectorX}px;
							width: 70px;
							height: 2px;
							background: #30363d;
							z-index: 5;
						"></div>
					`);
					$('#bracket-container').append(finalConnector);
				}
			}
		}
	}

	// Function to handle BYE matches
	function handleByes() {
		let hasChanges = true;
		let iterations = 0;
		const maxIterations = 15; // Safety limit
		
		while (hasChanges && iterations < maxIterations) {
			hasChanges = false;
			iterations++;
			
			for (let round = 1; round <= totalRounds; round++) {
				if (!bracketData[round]) continue; // Safety check
				
				bracketData[round].forEach(match => {
					if (!match || match.winner) return; // Only process matches without winners
					
					const team1Valid = match.team1 && match.team1 !== '' && match.team1 !== null;
					const team2Valid = match.team2 && match.team2 !== '' && match.team2 !== null;
					const team1IsBye = match.team1 === 'BYE';
					const team2IsBye = match.team2 === 'BYE';
					
					// Handle different BYE scenarios
					if (team1IsBye && team2Valid && !team2IsBye) {
						// Team 2 wins against BYE
						selectWinnerInternal(match, round, match.team2);
						hasChanges = true;
					} else if (team2IsBye && team1Valid && !team1IsBye) {
						// Team 1 wins against BYE
						selectWinnerInternal(match, round, match.team1);
						hasChanges = true;
					} else if (team1IsBye && team2IsBye) {
						// Both are BYEs - BYE advances
						selectWinnerInternal(match, round, 'BYE');
						hasChanges = true;
					}
				});
			}
		}
		
		if (iterations >= maxIterations) {
			console.warn('BYE handling reached maximum iterations, stopping to prevent infinite loop');
		}
	}

	// Internal function to select winner without re-rendering
	function selectWinnerInternal(match, roundNum, winner) {
		if (!match || match.winner || !winner) return; // Safety checks
		
		match.winner = winner;

		// Advance winner to next round
		if (roundNum < totalRounds) {
			const nextRound = roundNum + 1;
			const currentRoundMatches = bracketData[roundNum];
			
			if (!currentRoundMatches || !bracketData[nextRound]) return; // Safety checks
			
			const matchIndex = currentRoundMatches.indexOf(match);
			if (matchIndex === -1) return; // Safety check
			
			const nextMatchIndex = Math.floor(matchIndex / 2);
			const nextMatch = bracketData[nextRound][nextMatchIndex];
			
			if (!nextMatch) return; // Safety check
			
			const teamPosition = matchIndex % 2;

			// Update the next match with the winner
			if (teamPosition === 0) {
				// Winner goes to team1 position in next match
				if (nextMatch.team1 !== winner) {
					nextMatch.team1 = winner;
					// Clear winner if teams change to allow new BYE processing
					if (nextMatch.winner) {
						nextMatch.winner = '';
					}
				}
			} else {
				// Winner goes to team2 position in next match
				if (nextMatch.team2 !== winner) {
					nextMatch.team2 = winner;
					// Clear winner if teams change to allow new BYE processing
					if (nextMatch.winner) {
						nextMatch.winner = '';
					}
				}
			}
		}
	}

	// Function to immediately clear winner visual states for a specific match
	function clearMatchWinnerVisuals(matchId) {
		const matchDiv = $(`[data-match-id="${matchId}"]`);
		if (matchDiv.length > 0) {
			matchDiv.find('.team1').removeClass('winner');
			matchDiv.find('.team2').removeClass('winner');
			matchDiv.find('.vote-btn').prop('disabled', false);
		}
	}

	// Function to undo match result and cascade changes
	function undoMatchResult(match, roundNum) {
		if (!match || !match.winner) return; // Safety checks
		
		const winner = match.winner;
		match.winner = '';
		
		// Immediately clear winner visuals for this match
		clearMatchWinnerVisuals(match.id);
		
		// Clear this winner from subsequent rounds
		function clearFromNextRounds(fromRound, targetWinner) {
			for (let round = fromRound + 1; round <= totalRounds; round++) {
				if (!bracketData[round]) continue;
				
				for (let nextMatch of bracketData[round]) {
					let changed = false;
					if (nextMatch.team1 === targetWinner) {
						nextMatch.team1 = '';
						changed = true;
					}
					if (nextMatch.team2 === targetWinner) {
						nextMatch.team2 = '';
						changed = true;
					}
					
					// If we changed teams and there was a winner, clear it and cascade
					if (changed && nextMatch.winner) {
						const nextWinner = nextMatch.winner;
						nextMatch.winner = '';
						// Immediately clear visual state for this match too
						clearMatchWinnerVisuals(nextMatch.id);
						// Recursively clear from subsequent rounds
						clearFromNextRounds(round, nextWinner);
					}
				}
			}
		}
		
		clearFromNextRounds(roundNum, winner);
	}

	// Global flag to prevent concurrent bracket operations
	let isProcessingBracket = false;

	// Function to select winner
	function selectWinner(matchId, winner) {
		if (!winner || winner.trim() === '' || isProcessingBracket) return; // Safety check
		
		isProcessingBracket = true;
		
		// Find and update the match
		let match = null;
		let roundNum = 0;
		
		for (let round = 1; round <= totalRounds; round++) {
			if (!bracketData[round]) continue; // Safety check
			const found = bracketData[round].find(m => m.id === matchId);
			if (found) {
				match = found;
				roundNum = round;
				break;
			}
		}

		if (!match || match.winner) {
			isProcessingBracket = false;
			return; // Safety checks
		}

		// Use internal function to avoid recursion
		selectWinnerInternal(match, roundNum, winner);

		// Check for tournament completion
		if (roundNum === totalRounds && winner && winner !== 'BYE') {
			showWinner(winner);
		}
		
		// Use requestAnimationFrame for smooth UI updates
		requestAnimationFrame(() => {
			renderBracket(true); // Skip BYE handling in render
			
			// Wait for animations to complete before handling BYEs
			setTimeout(() => {
				handleByes();
				// Force a second render to ensure winner states are properly applied
				setTimeout(() => {
					renderBracket(true);
					isProcessingBracket = false;
				}, 10);
			}, 50); // Much shorter delay since no positioning animations
		});
	}

	// Function to show winner
	function showWinner(winner) {
		$('#winner-section .winner-name').text(winner);
		$('#winner-section').show();
	}

	// Function to hide winner
	function hideWinner() {
		$('#winner-section').hide();
		$('#winner-section .winner-name').text('');
	}

	// Event handlers
	$('#generate-bracket').on('click', function() {
		const movieText = $('#movie-list').val().trim();
		if (!movieText) {
			alert('Please enter some movies first!');
			return;
		}

		const movies = parseMovieList(movieText);
		if (movies.length < 2) {
			alert('Please enter at least 2 movies!');
			return;
		}

		if (movies.length > 64) {
			alert('Maximum 64 movies supported. Using first 64.');
			movies.splice(64);
		}

		// Complete cleanup - remove all existing elements and data
		hideWinner();
		currentBracket = [];
		bracketData = [];
		totalRounds = 0;
		isProcessingBracket = false; // Reset processing flag
		$('#bracket-container').empty();

		// Small delay to ensure cleanup completes
		setTimeout(() => {
			// Create new bracket
			currentBracket = shuffle(movies);
			bracketData = createBracketStructure(currentBracket);
			
			// Handle BYEs immediately after bracket creation
			handleByes();
			
			// Render bracket with BYEs already processed
			renderBracket(true);
			
			// Add static connector lines after bracket is rendered
			setTimeout(() => {
				addStaticConnectorLines();
				updateCollapseButtonState(); // Update button states
			}, 50);
			
			$('#controls').show().css('display', 'flex');
			$('#bracket-section').show();
		}, 10);
	});

	$('#shuffle-bracket').on('click', function() {
		if (currentBracket.length === 0) return;
		
		// Clear winner display
		hideWinner();
		isProcessingBracket = false; // Reset processing flag
		
		// Small delay to ensure cleanup
		setTimeout(() => {
			const shuffledMovies = shuffle(currentBracket);
			bracketData = createBracketStructure(shuffledMovies);
			
			// Reset collapsed rounds on shuffle
			collapsedRounds = 0;
			
			// Handle BYEs immediately after bracket creation
			handleByes();
			
			// Render bracket with BYEs already processed
			renderBracket(true);
			
			// Add static connector lines after bracket is rendered
			setTimeout(() => {
				addStaticConnectorLines();
				updateCollapseButtonState(); // Update button states
			}, 50);
		}, 10);
	});

	// Handle vote button clicks
	$(document).on('click', '.vote-btn', function() {
		const button = $(this);
		
		// Prevent multiple rapid clicks and concurrent processing
		if (button.prop('disabled') || button.data('processing') || isProcessingBracket) return;
		
		button.data('processing', true);
		button.prop('disabled', true); // Temporarily disable the button
		
		const matchDiv = button.closest('.match');
		const matchId = parseInt(matchDiv.data('match-id'));
		const teamNum = button.data('team');
		const teamInput = button.siblings('.team-input');
		const winner = teamInput.val().trim();
		
		if (!winner || winner === 'BYE') {
			button.data('processing', false);
			button.prop('disabled', false);
			return;
		}
		
		selectWinner(matchId, winner);
		
		// Reset processing flag after render is complete
		setTimeout(() => {
			button.data('processing', false);
			// Don't re-enable if the button should stay disabled (winner selected)
			if (!button.closest('.match').find('.team-input').hasClass('winner')) {
				button.prop('disabled', false);
			}
		}, 200);
	});

	// Handle team input changes
	$(document).on('input', '.team-input', function() {
		const inputElement = $(this);
		const matchDiv = inputElement.closest('.match');
		const matchId = parseInt(matchDiv.data('match-id'));
		const newValue = inputElement.val().trim();
		
		// Determine which team by checking the parent container
		const isTeam1 = inputElement.closest('.team1').length > 0;
		
		// Find and update the match data
		for (let round = 1; round <= totalRounds; round++) {
			const match = bracketData[round].find(m => m.id === matchId);
			if (match) {
				if (isTeam1) {
					match.team1 = newValue;
				} else {
					match.team2 = newValue;
				}
				break;
			}
		}
	});

	// Handle undo button clicks
	$(document).on('click', '.undo-btn', function() {
		const button = $(this);
		
		if (button.data('processing') || isProcessingBracket) return;
		
		button.data('processing', true);
		isProcessingBracket = true;
		
		const matchDiv = button.closest('.match');
		const matchId = parseInt(matchDiv.data('match-id'));
		
		// Find and clear the match
		let match = null;
		let roundNum = 0;
		
		for (let round = 1; round <= totalRounds; round++) {
			if (!bracketData[round]) continue;
			const found = bracketData[round].find(m => m.id === matchId);
			if (found) {
				match = found;
				roundNum = round;
				break;
			}
		}

		if (!match || !match.winner) {
			button.data('processing', false);
			isProcessingBracket = false;
			return;
		}

		// Clear this match and cascade the changes forward
		undoMatchResult(match, roundNum);
		
		// Hide winner if this was the final match
		if (roundNum === totalRounds) {
			hideWinner();
		}
		
		// Re-render the bracket
		requestAnimationFrame(() => {
			renderBracket(true);
			
			// Wait for animations to complete before handling BYEs
			setTimeout(() => {
				handleByes();
				// Force a second render to ensure winner states are properly cleared
				setTimeout(() => {
					renderBracket(true);
					button.data('processing', false);
					isProcessingBracket = false;
				}, 10);
			}, 50); // Much shorter delay since no positioning animations
		});
	});

	// Handle new tournament button
	$(document).on('click', '#new-tournament', function() {
		hideWinner();
		currentBracket = [];
		bracketData = [];
		totalRounds = 0;
		collapsedRounds = 0; // Reset collapsed rounds
		isProcessingBracket = false; // Reset processing flag
		$('#bracket-container').empty();
		$('#controls').hide();
		$('#bracket-section').hide();
		$('#movie-list').val('');
		updateMovieCount(); // Update count display
	});
	
	// Function to collapse the leftmost round
	function collapseLeftmostRound() {
		if (collapsedRounds >= totalRounds - 1) {
			return; // Button should be disabled, but just in case
		}
		
		const roundToCollapse = collapsedRounds + 1;
		
		// Check if the round to collapse has any matches with winners
		const hasCompletedMatches = bracketData[roundToCollapse].some(match => match.winner);
		
		if (!hasCompletedMatches) {
			alert(`Please complete some matches in round ${roundToCollapse} before collapsing it.`);
			return;
		}
		
		collapsedRounds++;
		
		// Re-render the bracket (div will be automatically removed)
		renderBracket(true);
		
		// Re-add connector lines
		setTimeout(() => {
			addStaticConnectorLines();
		}, 50);
		
		// Update button states
		updateCollapseButtonState();
	}
	
	// Function to restore the leftmost collapsed round
	function restoreLeftmostRound() {
		if (collapsedRounds <= 0) {
			return; // Button should be disabled, but just in case
		}
		
		collapsedRounds--;
		
		// Re-render the bracket (div will be automatically added back)
		renderBracket(true);
		
		// Re-add connector lines
		setTimeout(() => {
			addStaticConnectorLines();
		}, 50);
		
		// Update button states
		updateCollapseButtonState();
	}
	
	// Function to update collapse button states
	function updateCollapseButtonState() {
		const collapseBtn = $('#collapse-round');
		const restoreBtn = $('#restore-round');
		
		// Update collapse button
		if (collapsedRounds >= totalRounds - 1) {
			collapseBtn.prop('disabled', true).text('No More Rounds');
		} else {
			collapseBtn.prop('disabled', false).text('Collapse Leftmost Round');
		}
		
		// Update restore button
		if (collapsedRounds <= 0) {
			restoreBtn.prop('disabled', true);
		} else {
			restoreBtn.prop('disabled', false);
		}
	}
	
	// Handle collapse round button
	$(document).on('click', '#collapse-round', function() {
		collapseLeftmostRound();
	});
	
	// Handle restore round button
	$(document).on('click', '#restore-round', function() {
		restoreLeftmostRound();
	});
	
	// Handle PDF export button
	$(document).on('click', '#export-pdf', function() {
		exportToPDF();
	});
	
	// Function to export bracket as PDF
	async function exportToPDF() {
		// Check if required libraries are loaded
		if (typeof html2canvas === 'undefined') {
			alert('html2canvas library not loaded. Please refresh the page and try again.');
			return;
		}
		
		// Check for jsPDF in different possible locations
		const jsPDFLib = window.jsPDF || window.jspdf?.jsPDF || (typeof jsPDF !== 'undefined' ? jsPDF : null);
		if (!jsPDFLib) {
			alert('jsPDF library not loaded. Please refresh the page and try again.');
			return;
		}
		
		const bracketContainer = document.getElementById('bracket-container');
		if (!bracketContainer) {
			alert('No bracket to export!');
			return;
		}
		
		try {
			// Hide any hover effects and ensure clean state
			bracketContainer.style.pointerEvents = 'none';
			
			// Capture the bracket as canvas
			const canvas = await html2canvas(bracketContainer, {
				backgroundColor: '#0d1117',
				scale: 2, // Higher resolution
				useCORS: true,
				allowTaint: true
			});
			
			// Create PDF
			const imgData = canvas.toDataURL('image/png');
			const pdf = new jsPDFLib({
				orientation: 'landscape',
				unit: 'mm',
				format: 'a4'
			});
			
			// Calculate dimensions to fit the page
			const pdfWidth = pdf.internal.pageSize.getWidth();
			const pdfHeight = pdf.internal.pageSize.getHeight();
			const imgWidth = canvas.width;
			const imgHeight = canvas.height;
			const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
			
			const finalWidth = imgWidth * ratio;
			const finalHeight = imgHeight * ratio;
			const x = (pdfWidth - finalWidth) / 2;
			const y = (pdfHeight - finalHeight) / 2;
			
			pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
			pdf.save('movie-bracket.pdf');
			
			// Restore interactivity
			bracketContainer.style.pointerEvents = '';
			
		} catch (error) {
			console.error('PDF export failed:', error);
			alert('Failed to export PDF. Please try again.');
			bracketContainer.style.pointerEvents = '';
		}
	}
});
