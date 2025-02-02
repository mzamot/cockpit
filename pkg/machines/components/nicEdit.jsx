/*
 * This file is part of Cockpit.
 *
 * Copyright (C) 2018 Red Hat, Inc.
 *
 * Cockpit is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * Cockpit is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Cockpit; If not, see <http://www.gnu.org/licenses/>.
 */
import React from 'react';
import cockpit from 'cockpit';
import PropTypes from 'prop-types';
import {
    Modal,
    Button
} from 'patternfly-react';

import { ModalError } from 'cockpit-components-inline-notification.jsx';
import { NetworkTypeAndSourceRow, NetworkModelRow } from './nicBody.jsx';
import {
    changeNetworkSettings,
    getVm
} from '../actions/provider-actions.js';

import 'form-layout.less';

const _ = cockpit.gettext;

const NetworkMacRow = ({ network }) => {
    return (
        <>
            <label className='control-label' htmlFor='mac'>
                {_("MAC Address")}
            </label>
            <samp id='mac'>
                {network.mac}
            </samp>
        </>
    );
};

class EditNICModal extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            dialogError: undefined,
            networkType: props.network.type,
            networkSource: props.network.source.network || props.network.source.dev,
            networkModel: props.network.model,
            saveDisabled: false,
            availableSources: props.availableSources,
        };
        this.save = this.save.bind(this);
        this.onValueChanged = this.onValueChanged.bind(this);
        this.dialogErrorSet = this.dialogErrorSet.bind(this);
    }

    onValueChanged(key, value) {
        const stateDelta = { [key]: value };

        this.setState(stateDelta);

        if (key == 'networkType' && ['network', 'direct', 'bridge'].includes(value)) {
            let sources;
            if (value === "network")
                sources = this.state.availableSources.network;
            else
                sources = this.state.availableSources.device;

            if (sources && sources.length > 0)
                this.setState({ networkSource: sources[0], saveDisabled: false });
            else
                this.setState({ networkSource: undefined, saveDisabled: true });
        }
    }

    dialogErrorSet(text, detail) {
        this.setState({ dialogError: text, dialogErrorDetail: detail });
    }

    save() {
        const { dispatch, vm, network } = this.props;

        dispatch(changeNetworkSettings({
            vm, macAddress: network.mac,
            networkModel: this.state.networkModel,
            networkType: this.state.networkType,
            networkSource: this.state.networkSource
        }))
                .fail((exc) => {
                    this.dialogErrorSet(_("Network interface settings could not be saved"), exc.message);
                })
                .then(() => {
                    dispatch(getVm({ connectionName: vm.connectionName, id: vm.id }));
                    this.props.close();
                });
    }

    render() {
        const { idPrefix, vm, network, networks, nodeDevices, interfaces } = this.props;
        const defaultBody = (
            <form className='ct-form'>
                <NetworkTypeAndSourceRow idPrefix={idPrefix}
                                         dialogValues={this.state}
                                         onValueChanged={this.onValueChanged}
                                         networks={networks}
                                         interfaces={interfaces}
                                         nodeDevices={nodeDevices}
                                         connectionName={vm.connectionName} />
                <hr />
                <NetworkModelRow idPrefix={idPrefix}
                                 dialogValues={this.state}
                                 onValueChanged={this.onValueChanged}
                                 osTypeArch={vm.arch}
                                 osTypeMachine={vm.emulatedMachine} />
                <hr />
                <NetworkMacRow network={network} />
            </form>
        );
        const showFooterWarning = () => {
            if (vm.state === 'running' && (
                this.state.networkType !== network.type ||
                this.state.networkSource !== network.source[network.type] ||
                this.state.networkModel !== network.model)
            ) {
                return (
                    <span id={`${idPrefix}-edit-dialog-idle-message`} className='idle-message'>
                        <i className='pficon pficon-pending' />
                        <span>{_("Changes will take effect after shutting down the VM")}</span>
                    </span>
                );
            }
        };

        return (
            <Modal id={`${idPrefix}-edit-dialog-modal-window`} onHide={this.props.close} className='nic-edit' show>
                <Modal.Header>
                    <Modal.CloseButton onClick={this.props.close} />
                    <Modal.Title> {`${network.mac} Virtual Network Interface Settings`} </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {defaultBody}
                </Modal.Body>
                <Modal.Footer>
                    {this.state.dialogError && <ModalError dialogError={this.state.dialogError} dialogErrorDetail={this.state.dialogErrorDetail} />}
                    { showFooterWarning() }
                    <Button id={`${idPrefix}-edit-dialog-cancel`} bsStyle='default' className='btn-cancel' onClick={this.props.close}>
                        {_("Cancel")}
                    </Button>
                    <Button disabled={this.state.saveDisabled} id={`${idPrefix}-edit-dialog-save`} bsStyle='primary' onClick={this.save}>
                        {_("Save")}
                    </Button>
                </Modal.Footer>
            </Modal>
        );
    }
}

export class EditNICAction extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            showModal: false,
        };
        this.open = this.open.bind(this);
        this.close = this.close.bind(this);
    }

    close() {
        this.setState({ showModal: false });
    }

    open() {
        this.setState({ showModal: true });
    }

    render() {
        const { idPrefix, dispatch, vm, network, networks, nodeDevices, interfaces, availableSources } = this.props;

        return (
            <div id={`${idPrefix}-edit-dialog-full`}>
                <Button id={`${idPrefix}-edit-dialog`} bsStyle='default' onClick={this.open}>
                    {_("Edit")}
                </Button>

                {this.state.showModal && <EditNICModal idPrefix={idPrefix}
                                             dispatch={dispatch}
                                             vm={vm}
                                             network={network}
                                             networks={networks}
                                             nodeDevices={nodeDevices}
                                             interfaces={interfaces}
                                             availableSources={availableSources}
                                             close={this.close} />}
            </div>
        );
    }
}

EditNICAction.propTypes = {
    availableSources: PropTypes.array.isRequired,
    dispatch: PropTypes.func.isRequired,
    idPrefix: PropTypes.string.isRequired,
    vm: PropTypes.object.isRequired,
    network: PropTypes.object.isRequired,
    networks: PropTypes.array.isRequired,
    interfaces: PropTypes.array.isRequired,
    nodeDevices: PropTypes.array.isRequired,
};

export default EditNICAction;
