import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

/*リールの枠のスタイル*/
const reelStyle = {
	position: "relative",
	display: "flex",
	flexDirection: "column",
	height: "200px",
	width: "300px",
	overflow: "hidden",
};

const SlotMachine = ({ difficulty, isStop, onResult }) => {
	const reelRef = useRef(null);
	const requestRef = useRef();
	const positionRef = useRef(0);
	const isResultProcessed = useRef(false);

	// 難易度ごとの設定
	const config = {
		easy: { count: 3, speed: 4 }, // ゆっくり
		mid: { count: 8, speed: 8 }, // はやめ
		hard: { count: 10, speed: 10 }, // 速い
		expert: { count: 10, speed: 14 }, // 速い
	};

	const { count, speed } = config[difficulty];

	const baseImages = [];
	for (let i = 1; i <= count; i++) {
		const num = i.toString().padStart(2, "0");
		baseImages.push(`/${num}.svg`);
	}
	const displayImages = [...baseImages, ...baseImages, ...baseImages];

	const imageHeight = 200;
	const loopHeight = baseImages.length * imageHeight;

	// アニメーションループ
	const animate = useCallback(() => {
		if (isStop) return;

		positionRef.current += speed;
		if (positionRef.current >= loopHeight) {
			positionRef.current -= loopHeight;
		}

		if (reelRef.current) {
			reelRef.current.style.transform = `translateY(${positionRef.current}px)`;
		}

		requestRef.current = requestAnimationFrame(animate);
	}, [isStop, speed, loopHeight]);

	useEffect(() => {
		if (!isStop) {
			isResultProcessed.current = false;
			requestRef.current = requestAnimationFrame(animate);
		} else {
			if (requestRef.current) cancelAnimationFrame(requestRef.current);

			if (isResultProcessed.current) return;

			// Hit Detection & Snap to Center
			if (reelRef.current) {
				const container = reelRef.current.parentElement;
				const containerRect = container.getBoundingClientRect();
				const containerCenter = containerRect.top + containerRect.height / 2;

				const imgElements = reelRef.current.querySelectorAll("img");
				let minDistance = Infinity;
				let hitImageSrc = "";
				let hitImgCenter = 0;

				imgElements.forEach((img) => {
					const rect = img.getBoundingClientRect();
					const imgCenter = rect.top + rect.height / 2;
					const distance = Math.abs(containerCenter - imgCenter);

					if (distance < minDistance) {
						minDistance = distance;
						hitImageSrc = img.getAttribute("src");
						hitImgCenter = imgCenter;
					}
				});

				// Snap to center
				// ズレ（コンテナ中心 - 画像中心）だけずらす
				const delta = containerCenter - hitImgCenter;
				positionRef.current += delta;
				reelRef.current.style.transform = `translateY(${positionRef.current}px)`;

				// ファイル名処理
				let hitNumber = 1;
				if (hitImageSrc) {
					const match = hitImageSrc.match(/\/(\d+)\.svg/);
					if (match) {
						hitNumber = parseInt(match[1], 10);
					}
				}

				const isWin = hitNumber === 1;
				onResult(isWin, hitNumber);
				isResultProcessed.current = true;
			}
		}

		return () => {
			if (requestRef.current) cancelAnimationFrame(requestRef.current);
		};
	}, [isStop, animate, onResult]);

	const renderImageStyle = {
		display: "block",
		width: "300px",
		height: `${imageHeight}px`,
	};

	return (
		<div>
			<div style={reelStyle}>
				<div
					ref={reelRef}
					style={{
						display: "flex",
						flexDirection: "column",
						marginTop: `-${loopHeight}px`,
					}}
				>
					{displayImages.map((src, index) => (
						<img
							// biome-ignore lint/suspicious/noArrayIndexKey: しょうがない
							key={index}
							src={src}
							style={renderImageStyle}
							alt="slot item"
						/>
					))}
				</div>
			</div>
		</div>
	);
};

const App = () => {
	const [maxScore, setMaxScore] = useState(0);
	const [isStop, setIsStop] = useState(false);
	const [difficulty, setDifficulty] = useState("easy"); // 現在の難易度
	const [pendingDifficulty, setPendingDifficulty] = useState(null); // 次回の難易度予約
	const [consecutiveWins, setConsecutiveWins] = useState(0);
	const [currentCount, setCurrentCount] = useState(1);

	const onResult = useCallback(
		(isWin, hitNumber) => {
			setCurrentCount(hitNumber);

			if (isWin) {
				const newConsecutiveWins = consecutiveWins + 1;
				setConsecutiveWins(newConsecutiveWins);
				setMaxScore(Math.max(maxScore, newConsecutiveWins));

				// 3回連続で難易度アップ
				if (newConsecutiveWins >= 3) {
					if (difficulty === "easy") {
						setPendingDifficulty("mid");
					} else if (difficulty === "mid") {
						setPendingDifficulty("hard");
					} else if (difficulty === "hard") {
						setPendingDifficulty("expert");
					}
				}
			} else {
				setConsecutiveWins(0);
				// 失敗したら難易度リセット (予約)
				if (difficulty !== "easy") {
					setPendingDifficulty("easy");
				}
			}
		},
		[consecutiveWins, difficulty, maxScore],
	);

	const onClick = () => {
		if (isStop) {
			// スタート処理
			// 難易度更新の予約があれば適用
			if (pendingDifficulty) {
				setDifficulty(pendingDifficulty);
				setPendingDifficulty(null);
			}
			setIsStop(false);
		} else {
			setIsStop(true);
		}
	};

	const toKanji = (num) => {
		const kanji = [
			"零",
			"一",
			"二",
			"三",
			"四",
			"五",
			"六",
			"七",
			"八",
			"九",
			"十",
		];
		return kanji[num] || num;
	};

	const onTweetResult = () => {
		const tweetText = `クリスマスも${toKanji(currentCount)}人 \n（最高記録: ${maxScore}）\n #クリスマスも一人チャレンジ \n https://christmas.hals.one/`;
		window.open(
			`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`,
			"_blank",
		);
	};

	const [isMobile, setIsMobile] = useState(window.innerWidth <= 375);

	useEffect(() => {
		const handleResize = () => {
			setIsMobile(window.innerWidth <= 375);
		};
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	const handleDifficultyChange = (e) => {
		const newDifficulty = e.target.value;
		setDifficulty(newDifficulty);
		setPendingDifficulty(null);
		setConsecutiveWins(0); // 手動変更時はリセット
	};

	return (
		<>
			<div>
				<h3>最高回数: {maxScore}回</h3>
				<div style={{ marginBottom: "0.5em" }}>
					<label htmlFor="difficulty-select" style={{ marginRight: "0.5em" }}>
						難易度:
					</label>
					<select
						id="difficulty-select"
						value={difficulty}
						onChange={handleDifficultyChange}
						disabled={isStop} // スタート中（isStop=true）は変更不可
						style={{
							padding: "0.2em",
							fontSize: "1rem",
							fontFamily: "inherit",
						}}
					>
						<option value="easy">Easy</option>
						<option value="mid">Mid</option>
						<option value="hard">Hard</option>
						<option value="expert">Expert</option>
					</select>
					<span style={{ marginLeft: "0.5em" }}>(連勝: {consecutiveWins})</span>
				</div>
			</div>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					flexDirection: isMobile ? "column" : "row",
					alignItems: "center",
					flexWrap: "nowrap",
					fontFamily: "BIZ UDMincho",
					fontSize: isMobile ? "3rem" : "5rem",
					gap: isMobile ? "0.5em" : "0",
				}}
			>
				<span>クリスマスも</span>
				<SlotMachine
					difficulty={difficulty}
					isStop={isStop}
					onResult={onResult}
				/>
				<span>人</span>
			</div>
			<div style={{ marginTop: isMobile ? "1em" : "0" }}>
				<button type="button" onClick={onClick}>
					{isStop ? "スタート" : "ストップ"}
				</button>
			</div>
			<div style={{ marginTop: "1em" }}>
				<button
					type="button"
					onClick={onTweetResult}
					style={{
						padding: "0.5em 1em",
						backgroundColor: "#1DA1F2",
						color: "white",
						border: "none",
						borderRadius: "5px",
						fontSize: "0.9em",
						cursor: "pointer",
					}}
				>
					Xでシェア
				</button>
			</div>
		</>
	);
};

export default App;
