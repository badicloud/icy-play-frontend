import PoweredByLinks from './PoweredByLinks';
import PurchaseButton from './PurchaseButton';

/**
 * The demo layout footer content.
 */
function DemoLayoutFooterContent() {
	return (
		<>
			<div className="flex flex-auto shrink-0 gap-2">
				<PurchaseButton />
			</div>

			<div className="flex shrink-0 justify-end">
				<PoweredByLinks />
			</div>
		</>
	);
}

export default DemoLayoutFooterContent;
